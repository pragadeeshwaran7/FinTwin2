# utils.py
import pandas as pd
import numpy as np
from pathlib import Path
import joblib
import json
from datetime import datetime

def save_pickle(obj, path):
    joblib.dump(obj, path)

def load_pickle(path):
    return joblib.load(path)

def save_csv(df, path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path)

def load_csv(path, **kwargs):
    return pd.read_csv(path, parse_dates=True, index_col=0, **kwargs)

def ensure_dir(path):
    Path(path).mkdir(parents=True, exist_ok=True)

def now_str():
    return datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

def write_json(obj, path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=2)
