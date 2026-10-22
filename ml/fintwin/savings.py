"""Savings twin, built on the Indian personal finance & spending dataset
(20,000 household budgets, from the trial-1 branch).

v1 trained a RandomForest on the dataset's "Potential_Savings_*" columns.
Evaluation (ml/experiments/misc_eval.py) showed those labels are synthetic
noise: every row's saving is a random 5-30% of its spend, uncorrelated with
income or age (r = 0.004), and a fixed-share rule beats the forest (R2 0.72
vs 0.64). v2 therefore uses a transparent, data-driven method instead:

* Peer benchmark: households with similar income (+/-20%), the same city tier
  and occupation; median spend share per category.
* Saving opportunity per category: the amount above the peer median, or, if
  already at or below peers, the dataset's typical trimmable share
  (17.5% of discretionary spend, 2.5% of healthcare/education).
"""
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "indian_personal_finance.csv"
MODEL_PATH = ROOT / "models" / "savings_rf.joblib"

FIXED = ["Rent", "Loan_Repayment", "Insurance"]
VARIABLE = ["Groceries", "Transport", "Eating_Out", "Entertainment",
            "Utilities", "Healthcare", "Education", "Miscellaneous"]
NUMERIC = ["Income", "Age", "Dependents"] + FIXED + VARIABLE
CATEGORICAL = ["Occupation", "City_Tier"]
TARGETS = [f"Potential_Savings_{c}" for c in VARIABLE]
TRIM_SHARE = {c: (0.025 if c in ("Healthcare", "Education") else 0.175) for c in VARIABLE}
OCCUPATIONS = ["Professional", "Self_Employed", "Student", "Retired"]
TIERS = ["Tier_1", "Tier_2", "Tier_3"]


def _load():
    return pd.read_csv(DATA_PATH)


def train():
    df = _load()
    X, y = df[NUMERIC + CATEGORICAL], df[TARGETS]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    pipe = Pipeline([
        ("prep", ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL)],
                                   remainder="passthrough")),
        ("rf", RandomForestRegressor(n_estimators=60, max_depth=10, min_samples_leaf=10,
                                     random_state=42, n_jobs=-1)),
    ])
    pipe.fit(X_tr, y_tr)
    r2 = float(r2_score(y_te, pipe.predict(X_te)))
    bundle = {"model": pipe, "r2": r2, "rows": len(df)}
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)
    return bundle


def _bundle():
    if MODEL_PATH.exists():
        try:
            return joblib.load(MODEL_PATH)
        except Exception:
            pass  # stale pickle from another sklearn version -> retrain
    return train()


def _peers(df, profile):
    income = profile["Income"]
    for band, same_occ in ((0.2, True), (0.35, True), (0.35, False), (0.6, False)):
        mask = df["Income"].between(income * (1 - band), income * (1 + band))
        mask &= df["City_Tier"] == profile["City_Tier"]
        if same_occ:
            mask &= df["Occupation"] == profile["Occupation"]
        peers = df[mask]
        if len(peers) >= 40:
            return peers, band, same_occ
    return df, None, False


def run(payload):
    p = payload.get("profile", payload)
    profile = {
        "Income": float(p.get("income", 0)),
        "Age": float(p.get("age", 30)),
        "Dependents": float(p.get("dependents", 0)),
        "Occupation": p.get("occupation") if p.get("occupation") in OCCUPATIONS else "Professional",
        "City_Tier": p.get("city_tier") if p.get("city_tier") in TIERS else "Tier_1",
    }
    spend = p.get("expenses", {})
    for c in FIXED + VARIABLE:
        profile[c] = float(spend.get(c, 0) or 0)
    if profile["Income"] <= 0:
        raise ValueError("Monthly income must be greater than zero")

    df = _load()
    peers, band, same_occ = _peers(df, profile)
    total_spend = sum(profile[c] for c in FIXED + VARIABLE)
    categories = []
    pred = []
    for c in VARIABLE:
        peer_share = float((peers[c] / peers["Income"]).median())
        peer_spend = peer_share * profile["Income"]
        trimmable = TRIM_SHARE[c] * profile[c]
        saving = min(profile[c], max(profile[c] - peer_spend, trimmable))
        pred.append(saving)
        categories.append({
            "category": c.replace("_", " "), "key": c,
            "spend": profile[c], "share": profile[c] / profile["Income"],
            "peer_share": peer_share, "peer_spend": peer_share * profile["Income"],
            "potential_saving": float(saving),
            "reason": "above peers" if profile[c] > peer_spend + trimmable else "typical trim",
        })
    pred = np.array(pred)
    for c in FIXED:
        peer_share = float((peers[c] / peers["Income"]).median())
        categories.append({
            "category": c.replace("_", " "), "key": c, "fixed": True,
            "spend": profile[c], "share": profile[c] / profile["Income"],
            "peer_share": peer_share, "peer_spend": peer_share * profile["Income"],
            "potential_saving": 0.0,
        })

    disposable = profile["Income"] - total_spend
    potential = float(pred.sum())
    return {
        "income": profile["Income"],
        "total_spend": total_spend,
        "disposable": disposable,
        "savings_rate": disposable / profile["Income"],
        "potential_monthly_saving": potential,
        "projected_savings_rate": (disposable + potential) / profile["Income"],
        "projected_annual_extra": potential * 12,
        "categories": categories,
        "peer_group": {
            "size": int(len(peers)),
            "income_band": band,
            "same_occupation": same_occ,
            "median_desired_savings_pct": float(peers["Desired_Savings_Percentage"].median()),
            "median_disposable_share": float((peers["Disposable_Income"] / peers["Income"]).median()),
        },
        "model": {"name": "Peer benchmark (similar income, city tier and occupation)", "households": int(len(df)),
                  "note": "The dataset's savings labels are synthetic, so no ML model is used for the estimate."},
    }
