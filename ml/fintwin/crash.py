"""Crash-aware market risk, ported from research/crash-aware-india.

Same feature set, labelling strategy and blended risk index
(0.6 * RandomForest crisis probability + 0.4 * IsolationForest anomaly score)
as the research pipeline. Two changes make it usable as a live service:

* models are trained per request on the history the backend passes in, so no
  pre-built .pkl artifacts are required;
* the label also flags days followed by a >= 8% drawdown within 20 sessions,
  which gives the classifier a forward-looking target instead of only
  describing the current VIX regime.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import precision_score, recall_score, roc_auc_score
from sklearn.preprocessing import StandardScaler

from .common import history_frame

FEATURES = ["ret_1", "ret_5", "vol_20", "vol_5", "mom_20", "vol_ratio",
            "vix", "vix_chg", "skew_20", "kurt_20", "vol_spike"]
FEATURE_LABELS = {
    "ret_1": "1-day return", "ret_5": "5-day return", "vol_20": "20-day volatility",
    "vol_5": "5-day volatility", "mom_20": "20-day momentum", "vol_ratio": "Volatility ratio (5d/20d)",
    "vix": "India VIX level", "vix_chg": "India VIX change", "skew_20": "Return skew (20d)",
    "kurt_20": "Return kurtosis (20d)", "vol_spike": "Volume spike vs 60d median",
}
# Crisis windows for Indian markets (GFC and COVID crash).
MANUAL_CRISES = [("2008-01-14", "2009-03-31"), ("2020-02-20", "2020-04-30")]
RF_PARAMS = {"n_estimators": 300, "max_depth": 6, "random_state": 42,
             "class_weight": "balanced_subsample", "n_jobs": -1}
ISO_PARAMS = {"n_estimators": 200, "contamination": 0.01, "random_state": 42}
WINDOW = 20
DRAWDOWN_HORIZON = 20
DRAWDOWN_THRESHOLD = -0.08


def engineer_features(df, vix):
    X = pd.DataFrame(index=df.index)
    close = df["close"]
    X["close"] = close
    X["ret_1"] = close.pct_change(1)
    X["ret_5"] = close.pct_change(5)
    X["vol_20"] = X["ret_1"].rolling(WINDOW).std() * np.sqrt(252)
    X["vol_5"] = X["ret_1"].rolling(5).std() * np.sqrt(252)
    X["mom_20"] = close.pct_change(WINDOW)
    X["vol_ratio"] = X["vol_5"] / (X["vol_20"] + 1e-9)
    if vix is not None and len(vix):
        X["vix"] = vix["close"].reindex(X.index).ffill()
    else:
        # No VIX feed: use annualised realised volatility in VIX units.
        X["vix"] = X["vol_20"] * 100
    X["vix_chg"] = X["vix"].pct_change(1)
    X["skew_20"] = X["ret_1"].rolling(WINDOW).skew()
    X["kurt_20"] = X["ret_1"].rolling(WINDOW).kurt()
    vol = df["volume"].replace(0, np.nan)
    X["vol_spike"] = (vol / vol.rolling(60).median()).fillna(1.0)
    X = X.replace([np.inf, -np.inf], np.nan)
    return X.dropna(subset=FEATURES)


FEATURES_EXT = [
    "ret_1", "ret_5", "ret_20", "ret_60", "vol_5", "vol_20", "vol_60", "vol_ratio", "downside_vol_20",
    "skew_20", "kurt_20", "dd_252", "ma50_gap", "ma200_gap", "vix_z252", "vix_ratio20", "vix_chg5", "vol_spike",
]
# Scale-free version used by the turbulence model: volatilities relative to the asset's own 2-year median,
# so one model can score indices and individual stocks alike.
FEATURES_REL = [
    "ret_1", "ret_5", "ret_20", "ret_60", "vol_5_rel", "vol_20_rel", "vol_60_rel", "vol_ratio", "downside_rel",
    "skew_20", "kurt_20", "dd_252_rel", "ma50_gap_rel", "ma200_gap_rel", "vix_z252", "vix_ratio20", "vix_chg5", "vol_spike",
]
FEATURE_LABELS.update({
    "ret_20": "20-day return", "ret_60": "60-day return", "vol_60": "60-day volatility",
    "downside_vol_20": "Downside volatility (20d)", "dd_252": "Drawdown from 1-year high",
    "ma50_gap": "Gap to 50-day average", "ma200_gap": "Gap to 200-day average",
    "vix_z252": "Fear index vs its 1-year norm", "vix_ratio20": "Fear index vs 20-day average", "vix_chg5": "Fear index 5-day change",
})
HGB_PARAMS = {"max_iter": 300, "learning_rate": 0.04, "max_leaf_nodes": 15, "min_samples_leaf": 80,
              "l2_regularization": 1.0, "class_weight": "balanced", "random_state": 42}


def engineer_features_ext(df, vix):
    """Scale-free features that are comparable across markets (used by the pooled model)."""
    X = pd.DataFrame(index=df.index)
    close = df["close"]
    r = close.pct_change()
    X["close"] = close
    X["ret_1"], X["ret_5"], X["ret_20"], X["ret_60"] = r, close.pct_change(5), close.pct_change(20), close.pct_change(60)
    X["vol_5"] = r.rolling(5).std() * np.sqrt(252)
    X["vol_20"] = r.rolling(20).std() * np.sqrt(252)
    X["vol_60"] = r.rolling(60).std() * np.sqrt(252)
    X["vol_ratio"] = X["vol_5"] / (X["vol_20"] + 1e-9)
    X["downside_vol_20"] = r.clip(upper=0).rolling(20).std() * np.sqrt(252)
    X["skew_20"] = r.rolling(20).skew()
    X["kurt_20"] = r.rolling(20).kurt()
    X["dd_252"] = close / close.rolling(252, min_periods=60).max() - 1
    X["ma50_gap"] = close / close.rolling(50).mean() - 1
    X["ma200_gap"] = close / close.rolling(200, min_periods=120).mean() - 1
    if vix is not None and len(vix):
        v = vix["close"].reindex(X.index).ffill()
    else:
        v = X["vol_20"] * 100  # realised volatility as a stand-in fear gauge
    X["vix_z252"] = (v - v.rolling(252, min_periods=60).mean()) / (v.rolling(252, min_periods=60).std() + 1e-9)
    X["vix_ratio20"] = v / v.rolling(20).mean() - 1
    X["vix_chg5"] = v.pct_change(5)
    vol = df["volume"].replace(0, np.nan)
    X["vol_spike"] = (vol / vol.rolling(60).median()).fillna(1.0)
    base_vol = X["vol_20"].rolling(504, min_periods=120).median()
    for c in ("vol_5", "vol_20", "vol_60"):
        X[f"{c}_rel"] = X[c] / (base_vol + 1e-9)
    X["downside_rel"] = X["downside_vol_20"] / (base_vol + 1e-9)
    # Price-distance features scaled by the asset's own volatility.
    X["dd_252_rel"] = X["dd_252"] / (base_vol + 1e-9)
    X["ma50_gap_rel"] = X["ma50_gap"] / (base_vol + 1e-9)
    X["ma200_gap_rel"] = X["ma200_gap"] / (base_vol + 1e-9)
    return X.replace([np.inf, -np.inf], np.nan).dropna(subset=FEATURES_EXT + FEATURES_REL)


def forward_vol(close, horizon=20):
    r = close.pct_change()
    return r[::-1].rolling(horizon, min_periods=horizon).std()[::-1].shift(-1) * np.sqrt(252)


def turbulence_labels(frame):
    """1 when the next 20 sessions' realised volatility is in the asset's own top 20% (per-symbol threshold)."""
    thr = frame.groupby("sym")["fv"].transform(lambda s: s.quantile(0.8))
    return (frame["fv"] > thr).astype(int)


def label_crises(X):
    vix_thresh = X["vix"].quantile(0.95)
    label_vix = (X["vix"] >= vix_thresh).astype(int)
    label_manual = pd.Series(0, index=X.index)
    for start, end in MANUAL_CRISES:
        label_manual.loc[start:end] = 1
    close = X["close"]
    future_min = close[::-1].rolling(DRAWDOWN_HORIZON, min_periods=DRAWDOWN_HORIZON).min()[::-1].shift(-1)
    fwd_dd = future_min / close - 1
    label_dd = (fwd_dd <= DRAWDOWN_THRESHOLD).astype(float)
    label_dd[fwd_dd.isna()] = np.nan
    label = ((label_vix + label_manual + label_dd.fillna(0)) > 0).astype(float)
    # The last DRAWDOWN_HORIZON rows have an unknown future, so they can't be trained on
    # unless another rule already marks them as crisis days.
    label[label_dd.isna() & (label_vix + label_manual == 0)] = np.nan
    return label


def suggest_action(sup, iso):
    if sup > 0.8 or iso > 0.9:
        return "High risk: consider hedging (buy protection), reduce leverage and increase cash allocation."
    if sup > 0.6 or iso > 0.7:
        return "Elevated risk: rebalance towards defensive sectors and build a cash buffer."
    if sup > 0.35 or iso > 0.5:
        return "Watch closely: volatility is picking up; review stop-losses and position sizes."
    return "Normal conditions: no action needed, keep monitoring."


def risk_level(score):
    if score >= 0.6:
        return "high"
    if score >= 0.35:
        return "elevated"
    return "low"


def run(payload):
    ticker = payload.get("ticker", "^NSEI")
    df = history_frame(payload["history"])
    vix_rows = payload.get("vix_history") or []
    vix = history_frame(vix_rows) if vix_rows else None

    X = engineer_features(df, vix)
    if len(X) < 250:
        raise ValueError(f"Need at least ~1 year of daily history for {ticker}; got {len(X)} usable rows")
    y = label_crises(X)

    train_mask = y.notna()
    Xl, yl = X.loc[train_mask, FEATURES], y[train_mask].astype(int)
    split = int(len(Xl) * 0.8)
    X_train, X_test = Xl.iloc[:split], Xl.iloc[split:]
    y_train, y_test = yl.iloc[:split], yl.iloc[split:]

    scaler = StandardScaler().fit(X_train)
    iso = IsolationForest(**ISO_PARAMS).fit(scaler.transform(X_train))

    metrics = {"train_rows": len(X_train), "test_rows": len(X_test),
               "crisis_rate": float(yl.mean())}
    if y_train.nunique() < 2:
        rf = None
        metrics["note"] = "History contains no crisis-labelled days; risk uses the anomaly detector only."
    else:
        rf = RandomForestClassifier(**RF_PARAMS).fit(scaler.transform(X_train), y_train)
        if len(X_test) and y_test.nunique() == 2:
            proba = rf.predict_proba(scaler.transform(X_test))[:, 1]
            pred = (proba >= 0.5).astype(int)
            metrics["holdout_auc"] = float(roc_auc_score(y_test, proba))
            metrics["holdout_precision"] = float(precision_score(y_test, pred, zero_division=0))
            metrics["holdout_recall"] = float(recall_score(y_test, pred, zero_division=0))
        # Refit on all labelled rows for the live score.
        scaler = StandardScaler().fit(Xl)
        rf = RandomForestClassifier(**RF_PARAMS).fit(scaler.transform(Xl), yl)
        iso = IsolationForest(**ISO_PARAMS).fit(scaler.transform(Xl))

    Xs_all = scaler.transform(X[FEATURES])
    ref_scores = -iso.decision_function(scaler.transform(Xl))
    all_iso = -iso.decision_function(Xs_all)
    # Percentile of each day's anomaly score against the training distribution.
    iso_norm = np.searchsorted(np.sort(ref_scores), all_iso) / len(ref_scores)
    sup = rf.predict_proba(Xs_all)[:, 1] if rf is not None else np.zeros(len(X))
    risk = 0.6 * sup + 0.4 * iso_norm if rf is not None else iso_norm

    latest = X.iloc[-1]
    z = Xs_all[-1]
    importances = rf.feature_importances_ if rf is not None else np.ones(len(FEATURES)) / len(FEATURES)
    contrib = importances * np.abs(z)
    order = np.argsort(contrib)[::-1][:5]
    drivers = [{
        "feature": FEATURES[i], "label": FEATURE_LABELS[FEATURES[i]],
        "value": float(latest[FEATURES[i]]), "zscore": float(z[i]),
        "impact": float(contrib[i] / (contrib.sum() + 1e-12)),
    } for i in order]

    timeline_n = min(180, len(X))
    timeline = [{
        "date": d.strftime("%Y-%m-%d"), "risk": float(r), "close": float(c),
        "label": None if pd.isna(lbl) else int(lbl),
    } for d, r, c, lbl in zip(X.index[-timeline_n:], risk[-timeline_n:],
                             X["close"].iloc[-timeline_n:], y.iloc[-timeline_n:])]

    score = float(risk[-1])
    return {
        "ticker": ticker,
        "as_of": X.index[-1].strftime("%Y-%m-%d"),
        "risk_index": score,
        "level": risk_level(score),
        "supervised_probability": float(sup[-1]),
        "anomaly_score": float(iso_norm[-1]),
        "suggested_action": suggest_action(float(sup[-1]), float(iso_norm[-1])),
        "drivers": drivers,
        "timeline": timeline,
        "metrics": metrics,
        "used_vix": vix is not None,
        "model": "RandomForest crisis classifier + IsolationForest (crash-aware-india)",
    }
