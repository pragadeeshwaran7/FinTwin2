# data_fetch.py
import yfinance as yf
import pandas as pd
from config import INDEX_TICKER, VIX_TICKER, ADDITIONAL_TICKERS, START_DATE, END_DATE, DATA_DIR
from utils import save_csv, ensure_dir
from pathlib import Path

ensure_dir(DATA_DIR)

def fetch_one(ticker, start=START_DATE, end=END_DATE, interval="1d"):
    df = yf.download(ticker, start=start, end=end, interval=interval, auto_adjust=True, threads=True)
    # keep Close and Volume where present
    if "Close" in df.columns:
        columns = []
        if "Close" in df.columns:
            columns.append("Close")
        if "Volume" in df.columns:
            columns.append("Volume")
        df = df[columns]
    return df

def build_master_df():
    # index ticker
    print("Fetching index:", INDEX_TICKER)
    idx = fetch_one(INDEX_TICKER)
    if isinstance(idx.columns, pd.MultiIndex):
        idx.columns = pd.MultiIndex.from_tuples([(INDEX_TICKER,) + col for col in idx.columns.values])
    else:
        idx.columns = pd.MultiIndex.from_product([[INDEX_TICKER], idx.columns])
    # additional tickers
    layers = [idx]
    for t in ADDITIONAL_TICKERS:
        print("Fetching", t)
        d = fetch_one(t)
        if isinstance(d.columns, pd.MultiIndex):
            d.columns = pd.MultiIndex.from_tuples([(t,) + col for col in d.columns.values])
        else:
            d.columns = pd.MultiIndex.from_product([[t], d.columns])
        layers.append(d)
    # vix
    print("Fetching VIX:", VIX_TICKER)
    vix = fetch_one(VIX_TICKER)
    if isinstance(vix.columns, pd.MultiIndex):
        vix.columns = pd.MultiIndex.from_tuples([(VIX_TICKER,) + col for col in vix.columns.values])
    else:
        vix.columns = pd.MultiIndex.from_product([[VIX_TICKER], vix.columns])
    layers.append(vix)

    # join all on index (dates)
    master = pd.concat(layers, axis=1).sort_index()
    # flatten columns for simpler processing later
    # flatten columns to 'TICKER_Close', not 'TICKER_Close_TICKER'
    master.columns = ["_".join(map(str, col[:2])) for col in master.columns.values]
    master.index = pd.to_datetime(master.index)
    out_path = Path(DATA_DIR) / "master_prices.csv"
    save_csv(master, out_path)
    print("Saved master prices to", out_path)
    return master

if __name__ == "__main__":
    build_master_df()
