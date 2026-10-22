"""Crash-risk model experiments. Run: python3 ml/experiments/crash_eval.py

All variants predict the same forward-looking event: a >= 8% fall from today's
close at some point in the next 20 sessions. Train on data before CUTOFF, test
after it (includes the 2020 COVID crash and later corrections). Metric: ROC AUC
plus precision/recall at the top-decile threshold.
"""
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import average_precision_score, roc_auc_score

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
warnings.filterwarnings("ignore")
from fintwin import crash, datasets  # noqa: E402

CUTOFF = "2018-07-01"
HORIZON, THRESH = 20, -0.08


def target(close):
    fut_min = close[::-1].rolling(HORIZON, min_periods=HORIZON).min()[::-1].shift(-1)
    y = (fut_min / close - 1 <= THRESH).astype(float)
    y[fut_min.isna()] = np.nan
    return y


def market_frame(sym, vix_sym):
    df = datasets.fetch(sym)
    vix = datasets.fetch(vix_sym)
    X = crash.engineer_features_ext(df, vix)
    orig = crash.engineer_features(df, vix)
    for c in crash.FEATURES:
        if c not in X:
            X[c] = orig[c]
    X = X.dropna(subset=crash.FEATURES)
    X["y"] = target(X["close"])
    X["market"] = sym
    return X.dropna(subset=["y"])


def score(y, p):
    top = p >= np.quantile(p, 0.9)
    prec = y[top].mean() if top.any() else 0
    rec = (y[top].sum() / y.sum()) if y.sum() else 0
    return {"auc": roc_auc_score(y, p), "ap": average_precision_score(y, p), "base_rate": y.mean(), "prec@top10%": prec, "recall@top10%": rec}


def main():
    frames = {s: market_frame(s, v) for s, v in datasets.CRASH_UNIVERSE.items()}
    nifty = frames["^NSEI"]
    tr, te = nifty[nifty.index < CUTOFF], nifty[nifty.index >= CUTOFF]
    print(f"NIFTY rows: train {len(tr)} ({tr.index.min().date()}..), test {len(te)}; event rate test {te.y.mean():.3f}")
    results = {}

    # 1) Current production: RF on the 11 original features, NIFTY only.
    rf = RandomForestClassifier(**crash.RF_PARAMS).fit(tr[crash.FEATURES], tr.y)
    results["v1 RF, 11 features, NIFTY only (current)"] = score(te.y, rf.predict_proba(te[crash.FEATURES])[:, 1])

    # 2) Extended features, NIFTY only.
    hgb = HistGradientBoostingClassifier(**crash.HGB_PARAMS).fit(tr[crash.FEATURES_EXT], tr.y)
    results["v2 HGB, extended features, NIFTY only"] = score(te.y, hgb.predict_proba(te[crash.FEATURES_EXT])[:, 1])

    # 3) Pooled multi-market dataset (new dataset), extended features.
    pooled = pd.concat(frames.values())
    ptr = pooled[pooled.index < CUTOFF]
    print(f"Pooled train rows: {len(ptr)} from {ptr.market.nunique()} markets, events {int(ptr.y.sum())}")
    hgb_p = HistGradientBoostingClassifier(**crash.HGB_PARAMS).fit(ptr[crash.FEATURES_EXT], ptr.y)
    results["v3 HGB, extended features, 10-market pooled"] = score(te.y, hgb_p.predict_proba(te[crash.FEATURES_EXT])[:, 1])
    rf_p = RandomForestClassifier(**{**crash.RF_PARAMS, "n_estimators": 200}).fit(ptr[crash.FEATURES_EXT], ptr.y)
    results["v4 RF, extended features, 10-market pooled"] = score(te.y, rf_p.predict_proba(te[crash.FEATURES_EXT])[:, 1])

    print("\n=== NIFTY 50 out-of-sample (", CUTOFF, "->) ===")
    print(pd.DataFrame(results).T.round(3).to_string())

    print("\n=== Pooled HGB, out-of-sample AUC per market ===")
    per = {}
    for s, f in frames.items():
        t = f[f.index >= CUTOFF]
        if t.y.nunique() == 2:
            per[s] = round(roc_auc_score(t.y, hgb_p.predict_proba(t[crash.FEATURES_EXT])[:, 1]), 3)
    print(per, "mean", round(np.mean(list(per.values())), 3))


if __name__ == "__main__":
    main()
