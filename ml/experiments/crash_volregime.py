"""Walk-forward: predict a turbulent next month (forward 20d realised vol above the training 80th pct). Mean of yearly AUCs."""
import sys, warnings
from pathlib import Path
import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import roc_auc_score
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); warnings.filterwarnings("ignore")
from fintwin import crash, datasets
from crash_eval import market_frame

def fwd_vol(close):
    r = close.pct_change()
    return r[::-1].rolling(20, min_periods=20).std()[::-1].shift(-1) * np.sqrt(252)

frames = {}
for s, v in datasets.CRASH_UNIVERSE.items():
    f = market_frame(s, v); f["fv"] = fwd_vol(f["close"]); frames[s] = f.dropna(subset=["fv"])
pooled = pd.concat(frames.values()); pooled = pooled[pooled.index >= "2000-01-01"]
out = {}
for t in ["^NSEI", "^GSPC", "^FTSE", "^N225"]:
    res = {"naive(vol_20)": [], "v1 RF": [], "v2 HGB ext": [], "pooled HGB": [], "dd v1 RF": []}
    for year in range(2013, 2026):
        cut, end = f"{year}-01-01", f"{year + 1}-01-01"
        f = frames[t]; tr = f[f.index < cut]; te = f[(f.index >= cut) & (f.index < end)]
        thr = tr.fv.quantile(0.8)
        ytr, yte = (tr.fv > thr).astype(int), (te.fv > thr).astype(int)
        if yte.nunique() < 2: continue
        ptr = pooled[pooled.index < cut]
        yp = (ptr.fv > ptr.groupby("market").fv.transform(lambda s: s.quantile(0.8))).astype(int)
        res["naive(vol_20)"].append(roc_auc_score(yte, te.vol_20))
        res["v1 RF"].append(roc_auc_score(yte, RandomForestClassifier(**crash.RF_PARAMS).fit(tr[crash.FEATURES], ytr).predict_proba(te[crash.FEATURES])[:, 1]))
        res["v2 HGB ext"].append(roc_auc_score(yte, HistGradientBoostingClassifier(**crash.HGB_PARAMS).fit(tr[crash.FEATURES_EXT], ytr).predict_proba(te[crash.FEATURES_EXT])[:, 1]))
        res["pooled HGB"].append(roc_auc_score(yte, HistGradientBoostingClassifier(**crash.HGB_PARAMS).fit(ptr[crash.FEATURES_EXT], yp).predict_proba(te[crash.FEATURES_EXT])[:, 1]))
        if te.y.nunique() == 2:
            res["dd v1 RF"].append(roc_auc_score(te.y, RandomForestClassifier(**crash.RF_PARAMS).fit(tr[crash.FEATURES], tr.y).predict_proba(te[crash.FEATURES])[:, 1]))
    out[t] = {k: f"{np.mean(v):.3f} (n={len(v)})" for k, v in res.items()}
print(pd.DataFrame(out).T.to_string())
