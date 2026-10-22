"""Market dataset builder: downloads daily OHLCV from Yahoo Finance and caches it
under ml/data/market/ (refreshed when older than a day).

Used to train the pooled multi-market models and by evaluate.py.
"""
import json
import ssl
import time
import urllib.parse
import urllib.request
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "market"

# Equity indices with long histories, paired with the volatility index used as their fear gauge.
CRASH_UNIVERSE = {
    "^NSEI": "^INDIAVIX", "^BSESN": "^INDIAVIX", "^GSPC": "^VIX", "^IXIC": "^VIX", "^DJI": "^VIX",
    "^FTSE": "^VIX", "^GDAXI": "^VIX", "^N225": "^VIX", "^HSI": "^VIX", "^AXJO": "^VIX",
}
STOCK_UNIVERSE = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", "HINDUNILVR.NS", "BHARTIARTL.NS", "ITC.NS",
    "LT.NS", "AXISBANK.NS", "KOTAKBANK.NS", "MARUTI.NS", "M&M.NS", "HCLTECH.NS", "SUNPHARMA.NS", "SBIN.NS",
    "BAJFINANCE.NS", "TITAN.NS", "WIPRO.NS", "ASIANPAINT.NS",
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "JNJ", "XOM", "PG", "KO",
    "HSBA.L", "SHEL.L", "AZN.L", "ULVR.L", "VOD.L", "SAP.DE", "MC.PA", "7203.T", "0700.HK", "BHP.AX",
]


def _ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()


def fetch(symbol, range_="max", interval="1d", max_age_hours=20):
    """Daily OHLCV for `symbol` as a date-indexed DataFrame (cached on disk)."""
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{symbol.replace('^', '_').replace('&', 'and')}_{range_}.csv"
    if path.exists() and time.time() - path.stat().st_mtime < max_age_hours * 3600:
        return pd.read_csv(path, index_col=0, parse_dates=True)
    span = f"period1=0&period2={int(time.time())}" if range_ == "max" else f"range={range_}"
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?{span}&interval={interval}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (FinTwin)"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20, context=_ssl_context()) as r:
                data = json.load(r)["chart"]["result"][0]
            break
        except Exception:
            if attempt == 2:
                if path.exists():
                    return pd.read_csv(path, index_col=0, parse_dates=True)
                raise
            time.sleep(1 + attempt)
    q = data["indicators"]["quote"][0]
    df = pd.DataFrame({
        "open": q["open"], "high": q["high"], "low": q["low"], "close": q["close"], "volume": q["volume"],
    }, index=pd.to_datetime(data["timestamp"], unit="s").normalize())
    df = df[~df.index.duplicated(keep="last")].dropna(subset=["close"]).sort_index()
    df.to_csv(path)
    return df


def to_rows(df):
    out = df.reset_index().rename(columns={"index": "date"})
    out["date"] = out["date"].dt.strftime("%Y-%m-%d")
    return out.to_dict("records")
