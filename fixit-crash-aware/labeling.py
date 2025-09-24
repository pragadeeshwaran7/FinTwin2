# labeling.py
import pandas as pd
from config import DATA_DIR
from utils import load_csv, save_csv
from pathlib import Path

def label_crises(features_df):
    X = features_df.copy()
    # Strategy 1: VIX spike (top 5%)
    if "vix" in X.columns:
        vix_thresh = X["vix"].quantile(0.95)
        X["label_vix"] = (X["vix"] >= vix_thresh).astype(int)
    else:
        X["label_vix"] = 0

    # Strategy 2: manual crisis windows - add more as needed
    X["label_manual"] = 0
    manual_crises = [
        ("2004-05-01", "2004-05-31"),
        ("2008-04-01", "2009-03-31"),
        ("2015-08-01", "2015-08-31"),
        ("2016-11-01", "2016-11-30"),
        ("2020-03-01", "2022-03-31"),
        ("2023-01-01", "2023-01-31"),
        ("2024-04-01", "2025-03-31"),
    ]
    for s, e in manual_crises:
        X.loc[s:e, "label_manual"] = 1

    # Combine: any method -> crisis label
    X["label"] = ((X["label_vix"] + X["label_manual"]) > 0).astype(int)
    return X

def run_labeling():
    feats = load_csv(Path(DATA_DIR) / "features_india.csv")
    labeled = label_crises(feats)
    save_csv(labeled, Path(DATA_DIR) / "features_labeled_india.csv")
    print("Saved labeled features to data/features_labeled.csv")
    return labeled

if __name__ == "__main__":
    run_labeling()
