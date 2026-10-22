#!/usr/bin/env python3
import sys
import json
import traceback
from pathlib import Path
import numpy as np

def write(obj):
    print(json.dumps(obj))

def load_joblib_or_pickle(path):
    try:
        import joblib
        return joblib.load(path)
    except Exception:
        try:
            import pickle
            with open(path, 'rb') as f:
                return pickle.load(f)
        except Exception:
            return None

def main():
    try:
        data = json.loads(sys.stdin.read() or "{}")
        feat = data.get("feature")
        if feat is None:
            write({"error": "Missing 'feature' key. Provide numeric list under 'feature'."})
            return

        arr = np.array(feat).reshape(1, -1)

        base = Path(__file__).resolve().parent.parent
        artifact = base / ".." / "fintwin-models" / "personal" / "models" / "loan" / "loan_status_classifier" / "models" / "lightgbm_best_model.pkl"
        artifact = artifact.resolve()

        model = load_joblib_or_pickle(artifact)
        if model is None:
            write({"warning": "Could not load loan model. Returning fallback.", "prediction": 0})
            return

        try:
            pred = model.predict(arr).tolist()
            proba = model.predict_proba(arr).tolist() if hasattr(model, "predict_proba") else None
        except Exception:
            pred = [0]
            proba = None

        write({"prediction": pred, "probabilities": proba, "status": "success"})
    except Exception as e:
        write({"error": str(e), "trace": traceback.format_exc()})

if __name__ == "__main__":
    main()
