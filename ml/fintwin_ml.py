#!/usr/bin/env python3
"""FinTwin ML command-line bridge.

Usage: python3 fintwin_ml.py <command>   (JSON payload on stdin, JSON result on stdout)
Commands: health, crash_risk, train_risk, risk_status, forecast, optimize, savings, screen
"""
import json
import sys
import time
import traceback
import warnings

warnings.filterwarnings("ignore")


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "missing command"}))
        return 2
    command = sys.argv[1]
    raw = sys.stdin.read() if not sys.stdin.isatty() else ""
    payload = json.loads(raw or "{}")
    started = time.time()
    try:
        from fintwin.common import clean
        if command == "health":
            import numpy, pandas, sklearn, scipy  # noqa: F401
            result = {"numpy": numpy.__version__, "pandas": pandas.__version__,
                      "sklearn": sklearn.__version__, "scipy": scipy.__version__}
        elif command == "crash_risk":
            from fintwin import turbulence
            result = turbulence.run(payload)
        elif command == "train_risk":
            from fintwin import turbulence
            result = turbulence.load(force=bool(payload.get("force", True)))["metrics"]
        elif command == "risk_status":
            from fintwin import turbulence
            ok = turbulence.MODEL_PATH.exists()
            result = {"trained": ok, "path": str(turbulence.MODEL_PATH)}
        elif command == "forecast":
            from fintwin import forecast
            result = forecast.run(payload)
        elif command == "optimize":
            from fintwin import qaoa
            result = qaoa.run(payload)
        elif command == "screen":
            from fintwin import screen, turbulence
            vix = payload.get("vix") or {}
            risk = {}
            for a in payload["assets"]:
                try:
                    v = vix.get("^INDIAVIX" if a["ticker"].endswith((".NS", ".BO")) else "^VIX") or []
                    risk[a["ticker"]] = turbulence.run({"ticker": a["ticker"], "history": a["history"], "vix_history": v})["risk_index"]
                except Exception:
                    pass  # too little history for the risk model: rank without the overlay
            result = screen.run({**payload, "risk": risk})
        elif command == "savings":
            from fintwin import savings
            result = savings.run(payload)
        else:
            raise ValueError(f"unknown command '{command}'")
        out = {"ok": True, "result": clean(result), "elapsed_ms": int((time.time() - started) * 1000)}
    except ValueError as e:
        out = {"ok": False, "error": str(e)}
    except Exception as e:  # unexpected failure: include trace for the server log
        out = {"ok": False, "error": f"{type(e).__name__}: {e}", "trace": traceback.format_exc()}
    sys.stdout.write(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
