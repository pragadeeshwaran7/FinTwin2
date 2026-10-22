import sys, warnings, itertools
from pathlib import Path
import numpy as np, pandas as pd
from sklearn.metrics import r2_score
from sklearn.model_selection import train_test_split
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); warnings.filterwarnings("ignore")
from fintwin import savings, qaoa, datasets

# ---- Savings: is the target learnable beyond a fixed share of spend?
df = pd.read_csv(savings.DATA_PATH)
_, te = train_test_split(df, test_size=0.2, random_state=42)
b = savings._bundle()
pred = b["model"].predict(te[savings.NUMERIC + savings.CATEGORICAL])
rule = np.column_stack([te[c] * (0.175 if c not in ("Healthcare", "Education") else 0.025) for c in savings.VARIABLE])
y = te[savings.TARGETS].values
ratio = df["Potential_Savings_Groceries"] / df["Groceries"]
print(f"SAVINGS  RF R2={r2_score(y, pred):.3f}  fixed-share rule R2={r2_score(y, rule):.3f}  "
      f"corr(saving share, income)={ratio.corr(df.Income):+.3f} corr(share, age)={ratio.corr(df.Age):+.3f}")

# ---- QAOA: approximation ratio and P(optimum) on random real-price instances
rng = np.random.default_rng(0)
closes = {s: datasets.fetch(s, range_="2y")["close"].values[-250:] for s in datasets.STOCK_UNIVERSE[:20]}
syms = [s for s, c in closes.items() if len(c) == 250]
for p in (1, 2, 3, 4):
    ratios, popt, unif = [], [], []
    for trial in range(8):
        pick = list(rng.choice(syms, size=8, replace=False))
        r = qaoa.run({"assets": [{"ticker": s, "closes": list(closes[s])} for s in pick], "k": 4, "layers": p, "seed": trial})
        ratios.append(r["approximation_ratio"]); popt.append(r["optimum_probability"]); unif.append(r["uniform_probability"])
    print(f"QAOA p={p}: mean approx ratio {np.mean(ratios):.3f}, found optimum {np.mean([x == 1 for x in ratios]):.0%}, P(opt) {np.mean(popt):.3f} vs uniform {np.mean(unif):.3f}")

# ---- Range outlook: coverage of EWMA-volatility bands, 10 trading days ahead
cover80, cover95 = [], []
for s in datasets.STOCK_UNIVERSE:
    try: c = datasets.fetch(s, range_="10y")["close"]
    except Exception: continue
    r = np.log(c).diff()
    sig = np.sqrt((r ** 2).ewm(alpha=0.06).mean())  # RiskMetrics-style EWMA daily vol
    fwd = np.log(c).shift(-10) - np.log(c)
    z = (fwd / (sig * np.sqrt(10))).dropna()
    z = z[z.index >= "2019-01-01"]
    cover80.append((z.abs() <= 1.2816).mean()); cover95.append((z.abs() <= 1.96).mean())
print(f"RANGE 10d EWMA bands (2019+, {len(cover80)} stocks): 80% band covers {np.mean(cover80):.3f}, 95% band covers {np.mean(cover95):.3f}")
