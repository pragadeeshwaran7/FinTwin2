#!/usr/bin/env python3
import sys
import json
import traceback
from pathlib import Path
import numpy as np

def write(obj):
    print(json.dumps(obj))

def load_joblib(path):
    try:
        import joblib
        return joblib.load(path)
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
        artifact = base / ".." / "fintwin-models" / "stock" / "crash-aware" / "models" / "iso.pkl"
        artifact = artifact.resolve()

        model = load_joblib(artifact)
        if model is None:
            write({"warning": "Could not load model artifact. Returning dummy score.", "anomaly_score": float(np.mean(arr))})
            return

        # If model has decision_function or score_samples
        score = None
        if hasattr(model, "decision_function"):
            score = model.decision_function(arr).tolist()
        elif hasattr(model, "score_samples"):
            score = model.score_samples(arr).tolist()
        else:
            # fallback: use predict
            try:
                score = model.predict(arr).tolist()
            except Exception:
                score = float(np.mean(arr))

        write({"anomaly_score": score, "status": "success"})
    except Exception as e:
        write({"error": str(e), "trace": traceback.format_exc()})

if __name__ == "__main__":
    main()
