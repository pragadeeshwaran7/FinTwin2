# explainability.py
import joblib
import shap
import pandas as pd
from utils import load_csv, save_pickle
from pathlib import Path
import numpy as np
from config import MODELS_DIR

def compute_shap_topk(date_index, top_k=3):
    # loads models, scaler and returns top_k features for the date_index (index label)
    df = load_csv(Path("data") / "features_labeled.csv")
    features = ['ret_1','ret_5','vol_20','vol_5','mom_20','vol_ratio','vix','vix_chg','skew_20','kurt_20','vol_spike']
    df = df.dropna()
    if date_index not in df.index:
        raise ValueError("Date not in features")

    X = df[features]
    scaler = joblib.load(Path(MODELS_DIR) / "scaler_rf.pkl")
    clf = joblib.load(Path(MODELS_DIR) / "rf_crisis.pkl")
    X_s = scaler.transform(X)

    # Use a small sample background to speed up
    background = shap.sample(X_s, 100, random_state=42)
    explainer = shap.TreeExplainer(clf)
    # compute shap for sample (pass in scaled sample)
    idx = list(X.index).index(pd.to_datetime(date_index))

    raw_shap_vals = explainer.shap_values(X_s[idx:idx+1])

    # Handle both binary (single array) and multiclass (list of arrays)
    if isinstance(raw_shap_vals, list):
        shap_vals = raw_shap_vals[1]   # pick class 1 contributions
    else:
        shap_vals = raw_shap_vals      # already the right array



    #shap_vals = explainer.shap_values(X_s[idx:idx+1])[1]  # class 1 contributions
    feature_contribs = dict(zip(features, shap_vals[0]))
    # sort by absolute impact
    sorted_feats = sorted(feature_contribs.items(), key=lambda x: abs(x[1]), reverse=True)
    return sorted_feats[:top_k]

if __name__ == "__main__":
    # example usage: pick a high-risk day
    out = compute_shap_topk("2008-10-10")
    print(out)
