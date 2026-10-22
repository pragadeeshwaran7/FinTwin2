"""Walk-forward check: for each year Y, train on data before Y, test on Y. Pooled AUC across years per market."""
import sys, warnings
from pathlib import Path
import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import roc_auc_score
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); warnings.filterwarnings("ignore")
from fintwin import crash, datasets
from crash_eval import market_frame

frames = {s: market_frame(s, v) for s, v in datasets.CRASH_UNIVERSE.items()}
pooled = pd.concat(frames.values()); pooled = pooled[pooled.index >= "2000-01-01"]
TARGETS = ["^NSEI", "^GSPC", "^FTSE"]
preds = {t: {k: [] for k in ["y", "v1", "v2", "pooled", "ens"]} for t in TARGETS}
for year in range(2013, 2026):
    cut, end = f"{year}-01-01", f"{year + 1}-01-01"
    ptr = pooled[pooled.index < cut]
    mp = HistGradientBoostingClassifier(**crash.HGB_PARAMS).fit(ptr[crash.FEATURES_EXT], ptr.y)
    for t in TARGETS:
        f = frames[t]; tr = f[f.index < cut]; te = f[(f.index >= cut) & (f.index < end)]
        if len(te) == 0 or tr.y.nunique() < 2: continue
        m1 = RandomForestClassifier(**crash.RF_PARAMS).fit(tr[crash.FEATURES], tr.y)
        m2 = HistGradientBoostingClassifier(**crash.HGB_PARAMS).fit(tr[crash.FEATURES_EXT], tr.y)
        p1, p2, pp = m1.predict_proba(te[crash.FEATURES])[:, 1], m2.predict_proba(te[crash.FEATURES_EXT])[:, 1], mp.predict_proba(te[crash.FEATURES_EXT])[:, 1]
        rank = lambda a: pd.Series(a).rank(pct=True).values
        for k, v in [("y", te.y.values), ("v1", p1), ("v2", p2), ("pooled", pp), ("ens", (rank(p2) + rank(pp)) / 2)]:
            preds[t][k].append(v)
rows = {}
for t in TARGETS:
    y = np.concatenate(preds[t]["y"])
    rows[t] = {k: round(roc_auc_score(y, np.concatenate(preds[t][k])), 3) for k in ["v1", "v2", "pooled", "ens"]} | {"events": int(y.sum()), "days": len(y)}
print(pd.DataFrame(rows).T.to_string())
