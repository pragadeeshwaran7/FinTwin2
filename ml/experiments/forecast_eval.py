"""Forecast experiments on a 42-stock global dataset (10y daily). Walk-forward by year 2019-2025.
Metrics: directional AUC and accuracy vs the base rate (always predicting the majority direction)."""
import sys, warnings
from pathlib import Path
import numpy as np, pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); warnings.filterwarnings("ignore")
from fintwin import datasets
from fintwin.common import technical_indicators

def frame(sym):
    df = datasets.fetch(sym, range_="10y")
    f = technical_indicators(df)
    lc = np.log(df["close"])
    f["mom_60"] = lc.diff(60); f["mom_120"] = lc.diff(120); f["dd_252"] = df["close"] / df["close"].rolling(252, min_periods=60).max() - 1
    for h in (1, 5, 20): f[f"y{h}"] = lc.shift(-h) - lc
    f["sym"] = sym
    return f.replace([np.inf, -np.inf], np.nan).dropna()

frames = []
for s in datasets.STOCK_UNIVERSE:
    try: frames.append(frame(s))
    except Exception as e: print("skip", s, e)
data = pd.concat(frames)
FEATS = [c for c in data.columns if c not in ("y1", "y5", "y20", "sym")]
# cross-sectional rank features (relative strength within the universe on each date)
for c in ["mom_60", "mom_120", "ret_1", "rsi_14", "vol_10"]:
    data[f"{c}_xs"] = data.groupby(level=0)[c].rank(pct=True); FEATS.append(f"{c}_xs")
print("rows", len(data), "stocks", data.sym.nunique(), "features", len(FEATS))
res = {}
for h in (1, 5, 20):
    aucs, accs, bases, per_stock = [], [], [], []
    for year in range(2019, 2026):
        cut, end = pd.Timestamp(f"{year}-01-01"), pd.Timestamp(f"{year + 1}-01-01")
        tr = data[data.index < cut - pd.Timedelta(days=h * 2)]; te = data[(data.index >= cut) & (data.index < end)]
        ytr, yte = (tr[f"y{h}"] > 0).astype(int), (te[f"y{h}"] > 0).astype(int)
        m = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05, max_leaf_nodes=31, min_samples_leaf=200, random_state=42).fit(tr[FEATS], ytr)
        p = m.predict_proba(te[FEATS])[:, 1]
        aucs.append(roc_auc_score(yte, p)); accs.append(((p > 0.5) == yte).mean()); bases.append(max(yte.mean(), 1 - yte.mean()))
        if h == 1:  # current production approach: per-stock regressor on next-day return
            hits = []
            for s in te.sym.unique()[:15]:
                a, b = tr[tr.sym == s].tail(500), te[te.sym == s]
                if len(a) < 200 or not len(b): continue
                r = GradientBoostingRegressor(n_estimators=250, max_depth=3, learning_rate=0.03, subsample=0.8, random_state=42).fit(a[FEATS[:14]], a.y1)
                hits.append((np.sign(r.predict(b[FEATS[:14]])) == np.sign(b.y1)).mean())
            per_stock.append(np.mean(hits))
    res[f"{h}-day pooled HGB"] = {"AUC": np.mean(aucs), "accuracy": np.mean(accs), "base rate": np.mean(bases)}
    if per_stock: res["1-day per-stock GBR (current)"] = {"AUC": np.nan, "accuracy": np.mean(per_stock), "base rate": np.mean(bases)}
print(pd.DataFrame(res).T.round(3).to_string())
