"""Stock ideas screener: ranks stocks on well-documented factors.

Factors (each turned into a cross-sectional z-score within the universe):
  * momentum: 12-month return excluding the latest month (12-1 momentum)
  * trend: distance above/below the 200-day moving average, in units of volatility
  * low volatility: lower 60-day volatility scores higher
Ranking uses momentum only: in ml/experiments/ideas_eval.py (monthly rebalance,
2017-2026) it was the only variant with any edge. A 0.45/0.30/0.25 blend with
trend and low-vol lost to the equal-weight universe. Trend and low-vol are shown
as context, a stock must be above its 200-day average to be flagged "consider",
and the score is reduced when the turbulence model expects a rough month.

backtest() measures the composite with monthly rebalancing: the top third vs
an equal-weight portfolio of the whole universe. The universe is today's
large caps, so results carry survivorship bias; treat them as an upper bound.
"""
import numpy as np
import pandas as pd

from .common import history_frame

WEIGHTS = {"momentum": 1.0}
CONTEXT = ["trend", "low_vol"]
# Backtest results from ml/experiments/ideas_eval.py (top third by 12-1 momentum vs equal-weight universe).
BACKTEST = {
    "IN": {"universe": "101 NSE large & mid caps", "period": "2017-12 to 2026-10", "top_annual_return": 0.167, "universe_annual_return": 0.160, "excess_annual": 0.007, "hit_rate": 0.505, "information_ratio": 0.124},
    "GLOBAL": {"universe": "22 US/UK/EU/Asia mega caps", "period": "2017-10 to 2026-10", "top_annual_return": 0.270, "universe_annual_return": 0.171, "excess_annual": 0.099, "hit_rate": 0.615, "information_ratio": 0.757},
    "caveat": "Universes are today's large caps (survivorship bias), returns exclude costs and taxes. India shows no meaningful edge.",
}


def factors(close):
    """Factor values for each date of one price series."""
    r = np.log(close).diff()
    vol60 = r.rolling(60).std() * np.sqrt(252)
    return pd.DataFrame({
        "momentum": np.log(close.shift(21) / close.shift(252)),
        "trend": (close / close.rolling(200).mean() - 1) / (vol60 + 1e-9),
        "low_vol": -vol60,
        "vol60": vol60,
        "ret_1m": np.log(close / close.shift(21)),
    })


def _z(s):
    s = s.clip(s.quantile(0.05), s.quantile(0.95))
    return (s - s.mean()) / (s.std() + 1e-9)


def composite(snapshot):
    """snapshot: DataFrame indexed by ticker with factor columns (one date)."""
    z = pd.DataFrame({k: _z(snapshot[k]) for k in ["momentum", "trend", "low_vol"]})
    return sum(z[k] * w for k, w in WEIGHTS.items()), z


def backtest(closes, start="2017-01-01", top_frac=1 / 3):
    """closes: dict ticker -> close Series. Monthly rebalance, equal weight within the top bucket."""
    panel = pd.DataFrame(closes).sort_index().ffill(limit=5)
    month_ends = panel.resample("ME").last().index
    month_ends = [d for d in month_ends if d >= pd.Timestamp(start)]
    facs = {t: factors(panel[t].dropna()) for t in panel}
    top_r, all_r, dates = [], [], []
    for d0, d1 in zip(month_ends[:-1], month_ends[1:]):
        snap = pd.DataFrame({t: f.loc[:d0].iloc[-1] for t, f in facs.items() if len(f.loc[:d0]) > 260}).T.dropna()
        if len(snap) < 9:
            continue
        score, _ = composite(snap)
        p0 = panel.loc[:d0].iloc[-1]
        p1 = panel.loc[:d1].iloc[-1]
        fwd = (p1 / p0 - 1).reindex(snap.index).dropna()
        top = score.reindex(fwd.index).nlargest(max(3, int(len(fwd) * top_frac))).index
        top_r.append(fwd[top].mean())
        all_r.append(fwd.mean())
        dates.append(d1)
    top_r, all_r = np.array(top_r), np.array(all_r)
    excess = top_r - all_r
    ann = lambda x: float((1 + x).prod() ** (12 / len(x)) - 1)
    return {
        "months": len(top_r), "from": dates[0].strftime("%Y-%m"), "to": dates[-1].strftime("%Y-%m"),
        "top_annual_return": ann(top_r), "universe_annual_return": ann(all_r),
        "excess_annual": ann(top_r) - ann(all_r), "hit_rate": float((excess > 0).mean()),
        "information_ratio": float(excess.mean() / (excess.std() + 1e-12) * np.sqrt(12)),
        "top_annual_vol": float(top_r.std() * np.sqrt(12)), "universe_annual_vol": float(all_r.std() * np.sqrt(12)),
    }


def run(payload):
    """payload: {assets: [{ticker, name, history:[...]}], risk: {ticker: probability}, backtest: {...}}"""
    risk = payload.get("risk", {})
    rows, latest = {}, {}
    for a in payload["assets"]:
        df = history_frame(a["history"])
        if len(df) < 260:
            continue
        f = factors(df["close"]).iloc[-1]
        if f[list(WEIGHTS)].isna().any():
            continue
        rows[a["ticker"]] = f
        latest[a["ticker"]] = {"name": a.get("name", a["ticker"]), "price": float(df["close"].iloc[-1]), "currency": a.get("currency")}
    if len(rows) < 5:
        raise ValueError("Need at least 5 stocks with a year of history to rank")
    snap = pd.DataFrame(rows).T
    score, z = composite(snap)
    out = []
    for t in snap.index:
        p = risk.get(t)
        adj = float(score[t] - (max(0.0, p - 0.35) * 2 if p is not None else 0))
        out.append({
            "ticker": t, **latest[t], "score": adj, "raw_score": float(score[t]),
            "factors": {k: float(z.loc[t, k]) for k in ["momentum", "trend", "low_vol"]},
            "momentum_12_1": float(snap.loc[t, "momentum"]), "volatility": float(snap.loc[t, "vol60"]),
            "above_200dma": bool(snap.loc[t, "trend"] > 0), "return_1m": float(snap.loc[t, "ret_1m"]),
            "turbulence": p,
        })
    out.sort(key=lambda x: -x["score"])
    n = len(out)
    for i, o in enumerate(out):
        o["rank"] = i + 1
        o["signal"] = "consider" if i < max(3, n // 3) and o["above_200dma"] else "avoid" if i >= n - max(3, n // 3) else "hold"
        reasons = []
        if o["factors"]["momentum"] > 0.5: reasons.append(f"12-month momentum ahead of peers ({o['momentum_12_1'] * 100:+.0f}%)")
        elif o["factors"]["momentum"] < -0.5: reasons.append(f"12-month momentum behind peers ({o['momentum_12_1'] * 100:+.0f}%)")
        reasons.append("above its 200-day average" if o["above_200dma"] else "below its 200-day average")
        if o["factors"]["low_vol"] > 0.5: reasons.append("lower volatility than peers")
        elif o["factors"]["low_vol"] < -0.5: reasons.append("more volatile than peers")
        if o["turbulence"] is not None and o["turbulence"] >= 0.6: reasons.append("turbulence model expects a rough month")
        o["reasons"] = reasons
    return {"ideas": out, "weights": WEIGHTS, "backtest": BACKTEST}
