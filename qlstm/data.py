import os
import pandas as pd
import yfinance as yf
from pathlib import Path
import yaml

# Load config
with open("config.yaml") as f:
    config = yaml.safe_load(f)

CACHE_DIR = Path(config["data"]["cache_dir"])
CACHE_DIR.mkdir(exist_ok=True, parents=True)

def fetch_ohlcv(ticker: str, start: str, end: str) -> pd.DataFrame:
    cache_file = CACHE_DIR / f"{ticker}_{start}_{end}.parquet"
    if cache_file.exists():
        print(f"Loading cached data for {ticker}")
        df = pd.read_parquet(cache_file)
    else:
        print(f"Fetching data for {ticker}")
        df = yf.download(ticker, start=start, end=end)
        df.to_parquet(cache_file, engine="pyarrow", index=True)
    return df

def get_data(tickers: list, start: str, end: str) -> dict:
    data = {}
    for t in tickers:
        df = fetch_ohlcv(t, start, end)
        data[t] = df
    return data
