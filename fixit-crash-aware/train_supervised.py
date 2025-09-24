# train_supervised.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import joblib
from config import MODELS_DIR, RFC_PARAMS, RANDOM_STATE
from utils import load_csv, save_pickle
from pathlib import Path

MODEL_PATH = Path(MODELS_DIR) / "rf_crisis.pkl"
SCALER_PATH = Path(MODELS_DIR) / "scaler_rf.pkl"

def train_rf():
    df = load_csv(Path("data/India") / "features_labeled_india.csv")
    # feature list
    features = ['ret_1','ret_5','vol_20','vol_5','mom_20','vol_ratio','vix','vix_chg','skew_20','kurt_20','vol_spike']
    df = df.dropna()
    X = df[features]
    y = df["label"].astype(int)

    # train/test — preserve time order (no shuffle)
    split = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    clf = RandomForestClassifier(**RFC_PARAMS)
    clf.fit(X_train_s, y_train)

    y_pred = clf.predict(X_test_s)
    y_proba = clf.predict_proba(X_test_s)[:, 1]
    print("Classification report (test):")
    print(classification_report(y_test, y_pred))
    try:
        print("ROC AUC:", roc_auc_score(y_test, y_proba))
    except Exception:
        pass

    save_pickle(clf, MODEL_PATH)
    save_pickle(scaler, SCALER_PATH)
    print("Saved RF model and scaler at", MODEL_PATH, SCALER_PATH)
    return clf, scaler

if __name__ == "__main__":
    train_rf()
