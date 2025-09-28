import pandas as pd
import numpy as np
from ta.momentum import RSIIndicator
from ta.trend import EMAIndicator, MACD
from ta.volatility import BollingerBands, AverageTrueRange
from sklearn.preprocessing import StandardScaler
import yaml

# Load config
with open("config.yaml") as f:
    config = yaml.safe_load(f)

DEFAULT_FEATURES = config["features"]["default"]

def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    # SMA
    df['SMA_10'] = df['Close'].rolling(10).mean()
    df['SMA_50'] = df['Close'].rolling(50).mean()
    df['EMA_10'] = df['Close'].ewm(span=10, adjust=False).mean()
    df['EMA_50'] = df['Close'].ewm(span=50, adjust=False).mean()
    
    # MACD
    ema_12 = df['Close'].ewm(span=12, adjust=False).mean()
    ema_26 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = ema_12 - ema_26
    
    # RSI
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(window=14, min_periods=14).mean()
    avg_loss = loss.rolling(window=14, min_periods=14).mean()
    rs = avg_gain / avg_loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    # Bollinger Bands
    window = 20
    std = df['Close'].rolling(window).std()
    sma = df['Close'].rolling(window).mean()
    df['Bollinger_upper'] = sma + (std * 2)
    df['Bollinger_lower'] = sma - (std * 2)
    
    # ATR
    high = df['High']
    low = df['Low']
    close = df['Close']
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    df['ATR'] = tr.rolling(window=14).mean()
    
    df = df.bfill().ffill()
    
    return df

def select_features(df: pd.DataFrame, features: list = DEFAULT_FEATURES) -> pd.DataFrame:
    return df[features].copy()

def fit_scaler(df: pd.DataFrame) -> StandardScaler:
    scaler = StandardScaler()
    scaler.fit(df.values)
    return scaler

def transform_features(df: pd.DataFrame, scaler: StandardScaler) -> np.ndarray:
    return scaler.transform(df.values)
