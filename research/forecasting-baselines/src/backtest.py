# src/backtest.py
import numpy as np
import pandas as pd

def apply_allocations(prices: pd.Series, allocations: np.ndarray):
    """
    Simple backtest: allocations are integer units per asset.
    prices: DataFrame of close prices indexed by date with columns tickers
    allocations: array of units per asset
    We'll compute daily portfolio value starting from the day after predictions start.
    """
    tickers = prices.columns.tolist()
    # portfolio value series = sum_i allocation_i * price_i(t)
    port_vals = (prices * allocations).sum(axis=1)
    returns = port_vals.pct_change().fillna(0)
    cumret = (1 + returns).cumprod() - 1
    stats = {
        "total_return": cumret.iloc[-1],
        "annualized_return": (1 + cumret.iloc[-1]) ** (252 / len(cumret)) - 1 if len(cumret)>0 else 0,
        "max_drawdown": ((cumret.cummax() - cumret).max())
    }
    return port_vals, returns, stats
