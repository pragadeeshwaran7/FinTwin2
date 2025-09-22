import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from typing import Tuple, List

def fetch_assets(tickers: List[str], period='180d', interval='1d') -> pd.DataFrame:
    """
    Fetch multi-asset OHLCV data from yFinance and returns a single DataFrame
    with MultiIndex (date, ticker) or columns ticker_feature.
    """
    data = {}
    for t in tickers:
        df = yf.download(t, period=period, interval=interval, progress=False)
        if df.empty:
            raise RuntimeError(f"No data for {t}")
        # keep Close and Volume (you can expand to SMA etc later)
        # Select only required columns
        df = df[['Open','High','Low','Close','Volume']].copy()
        # If columns are MultiIndex, swap levels to (ticker, feature)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.swaplevel(1, 0)
        # If columns are not MultiIndex, wrap as (ticker, feature)
        if not isinstance(df.columns, pd.MultiIndex):
            df.columns = pd.MultiIndex.from_product([[t], df.columns])
        data[t] = df
    # join on index
    combined = pd.concat(data.values(), axis=1)
    # Ensure columns are MultiIndex (ticker, feature)
    if not isinstance(combined.columns, pd.MultiIndex):
        # If columns are not MultiIndex, convert them
        combined.columns = pd.MultiIndex.from_tuples(combined.columns)
    # forward/backfill small gaps
    combined = combined.sort_index().ffill().bfill()
    return combined

def engineer_features(df: pd.DataFrame, tickers: List[str]) -> pd.DataFrame:
    """
    Create simple returns and technical features for each ticker.
    Result: columns like (ticker, 'ret'), (ticker, 'sma_10'), ...
    """
    out = pd.DataFrame(index=df.index)
    for t in tickers:
        close = df[(t,'Close')]
        out[(t,'close')] = close
        out[(t,'ret')] = close.pct_change().fillna(0)
        out[(t,'sma_10')] = close.rolling(10).mean().fillna(method='bfill')
        out[(t,'ema_10')] = close.ewm(span=10, adjust=False).mean()
        # add volatility
        out[(t,'vol_10')] = close.pct_change().rolling(10).std().fillna(method='bfill')
    out.columns = pd.MultiIndex.from_tuples(out.columns)
    return out

def create_windows(feature_df: pd.DataFrame, tickers: List[str], window_size=60, target='ret') -> Tuple[np.ndarray,np.ndarray, StandardScaler]:
    """
    Create sliding windows for multivariate LSTM.
    X shape: (N, window_size, num_features)
    y shape: (N, num_assets)  -> predict next-step returns for each asset
    We'll predict next-step returns for all tickers (multi-output)
    """
    # flatten features per timestep: for each ticker select a small set of features
    features = []
    feature_names = []
    for t in tickers:
        features.append(feature_df[(t,'ret')].values.reshape(-1,1))
        feature_names.append((t,'ret'))
        features.append(feature_df[(t,'vol_10')].values.reshape(-1,1))
        feature_names.append((t,'vol_10'))
        # add price level to allow the model to learn scaling (optional)
        features.append(feature_df[(t,'close')].values.reshape(-1,1))
        feature_names.append((t,'close'))
    data_matrix = np.hstack(features)  # shape (T, F)
    scaler = StandardScaler()
    data_scaled = scaler.fit_transform(data_matrix)
    T, F = data_scaled.shape
    X = []
    Y = []
    for i in range(window_size, T-1):
        x = data_scaled[i-window_size:i, :]
        # y: next-step returns for each ticker (raw returns, not scaled)
        y_vals = np.array([feature_df[(t,'ret')].values[i+1] for t in tickers])
        X.append(x)
        Y.append(y_vals)
    X = np.stack(X)  # (N, window_size, F)
    Y = np.stack(Y)  # (N, n_assets)
    return X.astype(np.float32), Y.astype(np.float32), scaler
