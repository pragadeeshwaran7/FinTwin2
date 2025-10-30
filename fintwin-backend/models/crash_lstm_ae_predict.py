#!/usr/bin/env python3
import sys
import json
import traceback
from pathlib import Path
import numpy as np

def write(obj):
    print(json.dumps(obj))

def try_load_torch(path):
    try:
        import torch
        # try loading as scripted model first
        try:
            m = torch.jit.load(str(path))
            m.eval()
            return m
        except Exception:
            try:
                # normal load (may require model class)
                return torch.load(str(path), map_location='cpu')
            except Exception:
                return None
    except Exception:
        return None

def main():
    try:
        data = json.loads(sys.stdin.read() or "{}")
        seq = data.get("sequence")
        if seq is None:
            write({"error": "Missing 'sequence' key. Provide a list of timesteps under 'sequence'."})
            return

        arr = np.array(seq)

        base = Path(__file__).resolve().parent.parent
        artifact = base / ".." / "fintwin-models" / "stock" / "crash-aware" / "models" / "lstm_autoencoder.pt"
        artifact = artifact.resolve()

        model = try_load_torch(artifact)
        if model is None:
            write({"warning": "Could not load torch model. Returning reconstruction error fallback.", "reconstruction_error": float(np.mean(arr))})
            return

        try:
            import torch
            t = torch.tensor(arr, dtype=torch.float32).unsqueeze(0)
            with torch.no_grad():
                out = model(t)
            # attempt to compute reconstruction error
            try:
                import numpy as _np
                rec = _np.mean((out.numpy() - t.numpy()) ** 2).item()
            except Exception:
                rec = None
            write({"reconstruction_error": rec, "status": "success"})
        except Exception as e:
            write({"error": str(e), "trace": traceback.format_exc()})

    except Exception as e:
        write({"error": str(e), "trace": traceback.format_exc()})

if __name__ == "__main__":
    main()
