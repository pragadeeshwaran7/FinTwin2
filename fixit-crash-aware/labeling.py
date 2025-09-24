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
        ("2008-09-01", "2009-03-31"),
        ("2020-02-15", "2020-04-30")
    ]
    for s, e in manual_crises:
        X.loc[s:e, "label_manual"] = 1

    # Combine: any method -> crisis label
    X["label"] = ((X["label_vix"] + X["label_manual"]) > 0).astype(int)
    return X

def run_labeling():
    feats = load_csv(Path(DATA_DIR) / "features.csv")
    labeled = label_crises(feats)
    save_csv(labeled, Path(DATA_DIR) / "features_labeled.csv")
    print("Saved labeled features to data/features_labeled.csv")
    return labeled

if __name__ == "__main__":
    run_labeling()
