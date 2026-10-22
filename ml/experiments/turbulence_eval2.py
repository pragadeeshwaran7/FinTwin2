"""Turbulence model validation: pooled-index HGB with relative features, walk-forward by year 2013-2025.
Also scores 12 individual stocks the model never trained on."""
import sys, warnings
from pathlib import Path
import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); warnings.filterwarnings("ignore")
from fintwin import crash, datasets

def build(sym, vix_sym, range_="max"):
    X = crash.engineer_features_ext(datasets.fetch(sym, range_=range_), datasets.fetch(vix_sym))
    X["fv"] = crash.forward_vol(X["close"]); X["sym"] = sym
    return X.dropna(subset=["fv"])

idx = {s: build(s, v) for s, v in datasets.CRASH_UNIVERSE.items()}
stocks = {}
for s in ["RELIANCE.NS", "HDFCBANK.NS", "INFY.NS", "ITC.NS", "SBIN.NS", "AAPL", "MSFT", "JPM", "TSLA", "HSBA.L", "SAP.DE", "7203.T"]:
    stocks[s] = build(s, "^INDIAVIX" if s.endswith(".NS") else "^VIX", "10y")
extra = {}
for s in datasets.STOCK_UNIVERSE:
    try: extra[s] = build(s, "^INDIAVIX" if s.endswith(".NS") else "^VIX", "10y")
    except Exception: pass
pooled = pd.concat(list(idx.values()) + list(extra.values())); pooled = pooled[pooled.index >= "2000-01-01"]
res = {k: [] for k in list(idx) + list(stocks)}
naive = {k: [] for k in res}
for year in range(2013, 2026):
    cut, end = f"{year}-01-01", f"{year + 1}-01-01"
    ptr = pooled[pooled.index < cut]
    y = crash.turbulence_labels(ptr)
    m = HistGradientBoostingClassifier(**crash.HGB_PARAMS).fit(ptr[crash.FEATURES_REL], y)
    for name, f in {**idx, **stocks}.items():
        tr, te = f[f.index < cut], f[(f.index >= cut) & (f.index < end)]
        if len(tr) < 250 or len(te) < 50: continue
        yte = (te.fv > tr.fv.quantile(0.8)).astype(int)
        if yte.nunique() < 2: continue
        res[name].append(roc_auc_score(yte, m.predict_proba(te[crash.FEATURES_REL])[:, 1]))
        naive[name].append(roc_auc_score(yte, te.vol_20))
out = pd.DataFrame({"model AUC": {k: np.mean(v) for k, v in res.items() if v}, "naive vol_20 AUC": {k: np.mean(v) for k, v in naive.items() if v}, "years": {k: len(v) for k, v in res.items() if v}})
print(out.round(3).to_string())
print("mean indices", out.loc[list(idx)].mean().round(3).to_dict()); print("mean stocks", out.loc[list(stocks)].mean().round(3).to_dict())
