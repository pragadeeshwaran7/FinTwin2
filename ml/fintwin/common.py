"""Shared helpers for the FinTwin ML layer.

The Node backend fetches market data and passes it in as JSON, so nothing in
this package touches the network.
"""
import numpy as np
import pandas as pd


def history_frame(rows):
    """Convert [{date, open, high, low, close, volume}, ...] into a date-indexed frame."""
    if not rows:
        raise ValueError("history is empty")
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    df = df[~df.index.duplicated(keep="last")]
    for col in ("open", "high", "low", "close", "volume"):
        if col not in df.columns:
            df[col] = df["close"] if col != "volume" else 0.0
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["close"] = df["close"].ffill()
    df = df.dropna(subset=["close"])
    for col in ("open", "high", "low"):
        df[col] = df[col].fillna(df["close"])
    df["volume"] = df["volume"].fillna(0.0)
    return df


def technical_indicators(df):
    """Indicator set from research/qlstm (SMA, EMA, MACD, RSI, Bollinger, ATR) plus return lags."""
    out = pd.DataFrame(index=df.index)
    close = df["close"]
    out["ret_1"] = np.log(close).diff()
    for lag in range(2, 6):
        out[f"ret_lag_{lag}"] = out["ret_1"].shift(lag - 1)
    out["sma_10_gap"] = close / close.rolling(10).mean() - 1
    out["sma_50_gap"] = close / close.rolling(50).mean() - 1
    ema_10 = close.ewm(span=10, adjust=False).mean()
    ema_50 = close.ewm(span=50, adjust=False).mean()
    out["ema_spread"] = ema_10 / ema_50 - 1
    ema_12 = close.ewm(span=12, adjust=False).mean()
    ema_26 = close.ewm(span=26, adjust=False).mean()
    macd = ema_12 - ema_26
    out["macd_hist"] = (macd - macd.ewm(span=9, adjust=False).mean()) / close
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gain / (loss + 1e-12)
    out["rsi_14"] = 100 - 100 / (1 + rs)
    mid = close.rolling(20).mean()
    std = close.rolling(20).std()
    out["bb_pos"] = (close - mid) / (2 * std + 1e-12)
    prev_close = close.shift(1)
    tr = pd.concat(
        [df["high"] - df["low"], (df["high"] - prev_close).abs(), (df["low"] - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    out["atr_pct"] = tr.rolling(14).mean() / close
    out["vol_10"] = out["ret_1"].rolling(10).std()
    return out


def clean(value):
    """Make numpy/pandas values JSON-serialisable."""
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if isinstance(value, np.bool_):
        return bool(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        f = float(value)
        return None if not np.isfinite(f) else round(f, 6)
    if isinstance(value, np.ndarray):
        return clean(value.tolist())
    if isinstance(value, (pd.Timestamp,)):
        return value.strftime("%Y-%m-%d")
    return value
