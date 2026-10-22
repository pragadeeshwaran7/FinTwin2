"""Price-range outlook (replaces the v1 point forecast).

Walk-forward tests (ml/experiments/forecast_eval.py) on 41 global stocks showed
no model beats the base rate at predicting direction: 51.6% vs 51.7% one day
ahead, and likewise at 5 and 20 days, including the v1 gradient-boosting
regressor (50.1%). So instead of a misleading price target this module
forecasts what can be measured and is reliable: the likely range. It uses
RiskMetrics EWMA volatility scaled by sqrt(time), with a fat-tail adjustment
calibrated on the same 41 stocks. Out-of-sample 2019+, the 80% band held
79.7% of 10-day outcomes and the 95% band 92.9% before the adjustment.
"""
import numpy as np
import pandas as pd

from .common import history_frame

Z = {"50": 0.674, "80": 1.2816, "95": 2.10}  # 95% widened from 1.96 for fat tails
EWMA_ALPHA = 0.06
MAX_HORIZON = 60


def _coverage(close, horizon):
    """Walk-forward coverage of the bands on this symbol over the last ~3 years."""
    r = np.log(close).diff()
    sig = np.sqrt((r ** 2).ewm(alpha=EWMA_ALPHA).mean())
    z = ((np.log(close).shift(-horizon) - np.log(close)) / (sig * np.sqrt(horizon))).dropna().tail(750)
    if len(z) < 100:
        return None
    return {"cover80": float((z.abs() <= Z["80"]).mean()), "cover95": float((z.abs() <= Z["95"]).mean()), "samples": int(len(z))}


def run(payload):
    ticker = payload.get("ticker", "")
    horizon = int(max(1, min(MAX_HORIZON, payload.get("horizon", 10))))
    df = history_frame(payload["history"])
    close = df["close"]
    if len(close) < 120:
        raise ValueError(f"Need at least ~6 months of daily history for {ticker}; got {len(close)} rows")
    r = np.log(close).diff().dropna()
    sigma = float(np.sqrt((r ** 2).ewm(alpha=EWMA_ALPHA).mean().iloc[-1]))
    last = float(close.iloc[-1])
    dates = pd.bdate_range(close.index[-1] + pd.Timedelta(days=1), periods=horizon)
    path = []
    for k, d in enumerate(dates, start=1):
        s = sigma * np.sqrt(k)
        path.append({
            "date": d.strftime("%Y-%m-%d"), "price": last,
            "lower": last * np.exp(-Z["95"] * s), "upper": last * np.exp(Z["95"] * s),
            "lower80": last * np.exp(-Z["80"] * s), "upper80": last * np.exp(Z["80"] * s),
            "lower50": last * np.exp(-Z["50"] * s), "upper50": last * np.exp(Z["50"] * s),
        })
    end = path[-1]
    return {
        "ticker": ticker,
        "as_of": close.index[-1].strftime("%Y-%m-%d"),
        "last_close": last,
        "horizon": horizon,
        "forecast": path,
        "daily_volatility": sigma,
        "annual_volatility": sigma * np.sqrt(252),
        "range80": [end["lower80"], end["upper80"]],
        "range95": [end["lower"], end["upper"]],
        "move80_pct": float(np.exp(Z["80"] * sigma * np.sqrt(horizon)) - 1),
        "calibration": _coverage(close, horizon),
        "direction_skill": {"accuracy": 0.516, "base_rate": 0.517, "note": "No model in our tests predicts direction better than chance; the outlook is a range, not a target."},
        "model": "EWMA volatility range (RiskMetrics, fat-tail adjusted)",
    }
