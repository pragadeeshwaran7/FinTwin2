# anomaly_detector.py
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from pathlib import Path
from utils import load_csv, save_pickle, load_pickle
from config import ISO_PARAMS, MODELS_DIR, AE_SEQ_LEN
import joblib

MODEL_ISO_PATH = Path(MODELS_DIR) / "iso.pkl"
MODEL_AE_PATH = Path(MODELS_DIR) / "lstm_autoencoder.h5"
SCALER_RF_PATH = Path(MODELS_DIR) / "scaler_rf.pkl"
SCALER_AE_PATH = Path(MODELS_DIR) / "scaler_ae.pkl"

def train_isolation():
    df = load_csv(Path("data") / "features_labeled.csv")
    features = ['ret_1','ret_5','vol_20','vol_5','mom_20','vol_ratio','vix','vix_chg','skew_20','kurt_20','vol_spike']
    df = df.dropna()
    X = df[features]
    # Train iso on the earlier 80% (assumed more normal)
    split = int(len(X) * 0.8)
    X_train = X.iloc[:split]
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X_train)
    iso = IsolationForest(**ISO_PARAMS)
    iso.fit(Xs)
    save_pickle(iso, MODEL_ISO_PATH)
    save_pickle(scaler, SCALER_RF_PATH)
    print("Saved IsolationForest and scaler")
    return iso, scaler

def score_continuous():
    # loads models and scores test period; returns combined risk index DataFrame
    from train_supervised import train_rf  # if not trained import saved model instead
    import joblib, numpy as np
    df = load_csv(Path("data") / "features_labeled.csv")
    features = ['ret_1','ret_5','vol_20','vol_5','mom_20','vol_ratio','vix','vix_chg','skew_20','kurt_20','vol_spike']
    df = df.dropna()
    split = int(len(df) * 0.8)
    X_test = df[features].iloc[split:]
    y_test = df["label"].iloc[split:]

    # load rf and scaler
    rf = joblib.load(Path(MODELS_DIR) / "rf_crisis.pkl")
    scaler_rf = joblib.load(Path(MODELS_DIR) / "scaler_rf.pkl")
    X_test_s = scaler_rf.transform(X_test)
    sup_proba = rf.predict_proba(X_test_s)[:, 1]

    # iso
    iso = joblib.load(MODELS_DIR / "iso.pkl")
    scaler_iso = joblib.load(MODELS_DIR / "scaler_rf.pkl")
    iso_scores = -iso.decision_function(scaler_iso.transform(X_test))  # higher = more anomalous
    # normalize iso_scores
    iso_norm = (iso_scores - iso_scores.min()) / (iso_scores.max() - iso_scores.min() + 1e-9)
    risk_index = 0.6 * sup_proba + 0.4 * iso_norm
    out = pd.DataFrame(index=X_test.index)
    out["sup_proba"] = sup_proba
    out["iso_score"] = iso_norm
    out["risk_index"] = risk_index
    out["label"] = y_test.values
    return out

if __name__ == "__main__":
    train_isolation()
