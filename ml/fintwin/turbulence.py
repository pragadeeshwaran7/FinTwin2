"""Market-turbulence risk model (v2 of the crash-aware model).

Why v2: walk-forward tests (ml/experiments/) showed the v1 target, an 8% crash
within 20 sessions, is not predictable (AUC 0.41-0.59 across markets, i.e.
about chance). Turbulence is: "will the next 20 sessions' realised volatility be
in this asset's own top 20%?" Volatility clusters, and one model trained on a
pooled dataset of 10 global indices (2000-) plus 41 large-cap stocks (10y)
reaches walk-forward AUC of about 0.72 on indices (NIFTY 0.79) and 0.63 on
individual stocks, beating a naive "current volatility" baseline by
+0.12 / +0.06.

The model is trained once and cached in ml/models/turbulence.joblib; it is
retrained automatically when older than 7 days (or on `train_risk`).
"""
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, IsolationForest
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

from . import crash, datasets
from .common import history_frame

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "turbulence.joblib"
VERSION = 3
MAX_AGE_DAYS = 7
FEATURES = crash.FEATURES_REL
LABELS = {
    **crash.FEATURE_LABELS,
    "vol_5_rel": "5-day volatility vs normal", "vol_20_rel": "20-day volatility vs normal", "vol_60_rel": "60-day volatility vs normal",
    "downside_rel": "Downside volatility vs normal", "dd_252_rel": "Drawdown from 1-year high", "ma50_gap_rel": "Distance from 50-day average",
    "ma200_gap_rel": "Distance from 200-day average",
}


def _frame(df, vix, sym):
    X = crash.engineer_features_ext(df, vix)
    X["fv"] = crash.forward_vol(X["close"])
    X["sym"] = sym
    return X


def _universe():
    vix = {v: datasets.fetch(v) for v in set(datasets.CRASH_UNIVERSE.values())}
    frames = []
    for s, v in datasets.CRASH_UNIVERSE.items():
        f = _frame(datasets.fetch(s), vix[v], s)
        frames.append(f[f.index >= "2000-01-01"])
    for s in datasets.STOCK_UNIVERSE:
        try:
            frames.append(_frame(datasets.fetch(s, range_="10y"), vix["^INDIAVIX" if s.endswith((".NS", ".BO")) else "^VIX"], s))
        except Exception:
            continue  # delisted/renamed symbol: skip
    return pd.concat(frames)


def train():
    data = _universe()
    labelled = data.dropna(subset=["fv"])
    y = crash.turbulence_labels(labelled)

    # Holdout check: train before the last 3 years, test on them.
    cut = labelled.index.max() - pd.DateOffset(years=3)
    tr, te = labelled.index < cut, labelled.index >= cut
    model = HistGradientBoostingClassifier(**crash.HGB_PARAMS).fit(labelled.loc[tr, FEATURES], y[tr])
    p = model.predict_proba(labelled.loc[te, FEATURES])[:, 1]
    test = labelled.loc[te]
    is_index = test["sym"].str.startswith("^").values
    metrics = {
        "holdout_from": cut.strftime("%Y-%m-%d"),
        "auc_all": float(roc_auc_score(y[te], p)),
        "auc_indices": float(roc_auc_score(y[te][is_index], p[is_index])),
        "auc_stocks": float(roc_auc_score(y[te][~is_index], p[~is_index])),
        "naive_auc_all": float(roc_auc_score(y[te], test["vol_20"])),
        "walk_forward_auc_indices": 0.713, "walk_forward_auc_stocks": 0.630,  # ml/experiments/turbulence_eval2.py
        "train_rows": int(len(labelled)), "assets": int(labelled["sym"].nunique()), "base_rate": float(y.mean()),
    }

    model = HistGradientBoostingClassifier(**crash.HGB_PARAMS).fit(labelled[FEATURES], y)
    sample = labelled.sample(min(6000, len(labelled)), random_state=0)
    imp = permutation_importance(model, sample[FEATURES], crash.turbulence_labels(sample), n_repeats=3, random_state=0, scoring="roc_auc")
    scaler = StandardScaler().fit(labelled[FEATURES])
    iso = IsolationForest(n_estimators=200, contamination=0.01, random_state=42).fit(scaler.transform(labelled[FEATURES]))
    ref = np.sort(-iso.decision_function(scaler.transform(sample[FEATURES])))
    bundle = {
        "version": VERSION, "trained_at": time.time(), "model": model, "scaler": scaler, "iso": iso, "iso_ref": ref,
        "importance": dict(zip(FEATURES, np.clip(imp.importances_mean, 0, None))), "metrics": metrics,
    }
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)
    return bundle


def load(force=False):
    if not force and MODEL_PATH.exists():
        try:
            b = joblib.load(MODEL_PATH)
            if b.get("version") == VERSION and time.time() - b["trained_at"] < MAX_AGE_DAYS * 86400:
                return b
        except Exception:
            pass
    return train()


def suggest(level, prob):
    if level == "high":
        return "Turbulent weeks likely: consider trimming leverage, tightening stop-losses and keeping a cash buffer."
    if level == "elevated":
        return "Volatility is building: review position sizes and avoid adding to concentrated bets."
    return "Calm conditions expected: no defensive action needed, keep monitoring."


def run(payload):
    sym = payload.get("ticker", "^NSEI")
    df = history_frame(payload["history"])
    vix_rows = payload.get("vix_history") or []
    vix = history_frame(vix_rows) if vix_rows else None
    X = crash.engineer_features_ext(df, vix)
    if len(X) < 60:
        raise ValueError(f"Need at least ~1.5 years of daily history to score {sym}; got {len(X)} usable rows")

    b = load()
    prob = b["model"].predict_proba(X[FEATURES])[:, 1]
    anomaly = np.searchsorted(b["iso_ref"], -b["iso"].decision_function(b["scaler"].transform(X[FEATURES]))) / len(b["iso_ref"])
    score = float(prob[-1])
    level = "high" if score >= 0.6 else "elevated" if score >= 0.35 else "low"

    hist = X[FEATURES]
    z = ((hist.iloc[-1] - hist.mean()) / (hist.std() + 1e-9)).fillna(0)
    weight = pd.Series(b["importance"]) * z.abs()
    top = weight.sort_values(ascending=False).head(5)
    drivers = [{
        "feature": f, "label": LABELS.get(f, f), "value": float(X[f].iloc[-1]), "zscore": float(z[f]),
        "impact": float(weight[f] / (weight.sum() + 1e-12)),
    } for f in top.index]

    n = min(180, len(X))
    fv = crash.forward_vol(X["close"])
    timeline = [{"date": d.strftime("%Y-%m-%d"), "risk": float(r), "close": float(c), "realized_vol": None if pd.isna(v) else float(v)}
                for d, r, c, v in zip(X.index[-n:], prob[-n:], X["close"].iloc[-n:], fv.iloc[-n:])]
    return {
        "ticker": sym,
        "as_of": X.index[-1].strftime("%Y-%m-%d"),
        "risk_index": score,
        "level": level,
        "turbulence_probability": score,
        "anomaly_score": float(anomaly[-1]),
        "current_volatility": float(X["vol_20"].iloc[-1]),
        "normal_volatility": float(X["vol_20"].tail(504).median()),
        "suggested_action": suggest(level, score),
        "drivers": drivers,
        "timeline": timeline,
        "metrics": b["metrics"],
        "trained_at": time.strftime("%Y-%m-%d", time.localtime(b["trained_at"])),
        "used_vix": vix is not None,
        "model": "Turbulence model v2: gradient boosting on 51 pooled global assets",
        "definition": "Probability that realised volatility over the next 20 sessions is in this asset's own top 20%.",
    }
