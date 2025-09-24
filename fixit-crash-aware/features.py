# features.py
import pandas as pd
import numpy as np
from config import DATA_DIR, ROLL_WINDOW, INDEX_TICKER, VIX_TICKER, AE_FEATURES
from utils import load_csv, save_csv, ensure_dir
from pathlib import Path

ensure_dir(DATA_DIR)

def engineer_features(master_df, window=ROLL_WINDOW):
    # master_df: flattened columns like "SPY_Close", "SPY_Volume", "^VIX_Close"
    df = master_df.copy()
    # easier naming
    close_col = f"{INDEX_TICKER}_Close"
    vol_col = f"{INDEX_TICKER}_Volume"
    vix_col = f"{VIX_TICKER}_Close"

    X = pd.DataFrame(index=df.index)
    X["close"] = df[close_col]
    X["ret_1"] = X["close"].pct_change(1)
    X["ret_5"] = X["close"].pct_change(5)
    X["vol_20"] = X["ret_1"].rolling(window).std() * np.sqrt(252)
    X["vol_5"] = X["ret_1"].rolling(5).std() * np.sqrt(252)
    X["mom_20"] = X["close"].pct_change(window)
    X["vol_ratio"] = X["vol_5"] / (X["vol_20"] + 1e-9)
    # VIX features
    if vix_col in df.columns:
        X["vix"] = df[vix_col]
        X["vix_chg"] = X["vix"].pct_change(1)
    else:
        X["vix"] = np.nan
        X["vix_chg"] = np.nan
    X["skew_20"] = X["ret_1"].rolling(window).skew()
    X["kurt_20"] = X["ret_1"].rolling(window).kurt()
    # volume spike relative to 60-day median
    if vol_col in df.columns:
        X["vol_spike"] = (df[vol_col] / df[vol_col].rolling(60).median()).fillna(0)
    else:
        X["vol_spike"] = np.nan

    X = X.dropna()
    return X

def run_feature_pipeline():
    master = load_csv(Path(DATA_DIR) / "master_prices.csv")
    features = engineer_features(master)
    out = Path(DATA_DIR) / "features.csv"
    save_csv(features, out)
    print("Saved features to", out)
    # set AE_FEATURES in config dynamically if needed — caller can import or read features columns
    return features

if __name__ == "__main__":
    run_feature_pipeline()
