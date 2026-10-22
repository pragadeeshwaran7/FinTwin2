"""Stock-ideas factor experiments on a ~100-stock NSE universe (new dataset) + the global set.
Monthly rebalance 2017->, top third vs equal-weight universe."""
import sys, warnings
from pathlib import Path
import numpy as np, pandas as pd
sys.path.insert(0, str(Path(__file__).resolve().parents[1])); warnings.filterwarnings("ignore")
from fintwin import datasets, screen

NSE100 = """RELIANCE TCS HDFCBANK ICICIBANK INFY HINDUNILVR BHARTIARTL ITC LT AXISBANK KOTAKBANK MARUTI M&M HCLTECH SUNPHARMA SBIN
BAJFINANCE TITAN WIPRO ASIANPAINT ULTRACEMCO NESTLEIND POWERGRID NTPC ONGC TATASTEEL JSWSTEEL COALINDIA ADANIENT ADANIPORTS
BAJAJFINSV BAJAJ-AUTO HEROMOTOCO EICHERMOT DRREDDY CIPLA DIVISLAB APOLLOHOSP BRITANNIA TECHM GRASIM INDUSINDBK HDFCLIFE SBILIFE
TATACONSUM HINDALCO BPCL IOC GAIL DABUR GODREJCP MARICO PIDILITIND COLPAL HAVELLS SIEMENS ABB BOSCHLTD SHREECEM AMBUJACEM
ACC DLF GODREJPROP BERGEPAINT TORNTPHARM LUPIN AUROPHARMA BIOCON ZYDUSLIFE ICICIGI ICICIPRULI BANKBARODA PNB CANBK
CHOLAFIN MUTHOOTFIN SHRIRAMFIN TVSMOTOR ASHOKLEY TATAPOWER ADANIGREEN VEDL SAIL NMDC HAL BEL INDIGO TRENT DMART NAUKRI
PAGEIND MCDOWELL-N UBL TATACOMM PERSISTENT MPHASIS LTIM COFORGE POLYCAB VOLTAS BHARATFORG MRF BALKRISIND""".split()
closes = {}
for s in NSE100:
    try:
        c = datasets.fetch(f"{s}.NS", range_="10y")["close"]
        if len(c) > 800: closes[f"{s}.NS"] = c
    except Exception: pass
glob = {}
for s in datasets.STOCK_UNIVERSE:
    if s.endswith(".NS"): continue
    try: glob[s] = datasets.fetch(s, range_="10y")["close"]
    except Exception: pass
print("NSE stocks:", len(closes), " global:", len(glob))
VARIANTS = {
    "composite (current)": {"momentum": 0.45, "trend": 0.30, "low_vol": 0.25},
    "momentum only": {"momentum": 1.0, "trend": 0, "low_vol": 0},
    "low volatility only": {"momentum": 0, "trend": 0, "low_vol": 1.0},
    "momentum + low vol": {"momentum": 0.5, "trend": 0, "low_vol": 0.5},
    "trend only": {"momentum": 0, "trend": 1.0, "low_vol": 0},
}
rows = {}
for name, w in VARIANTS.items():
    screen.WEIGHTS = {k: v for k, v in w.items() if v}
    for uname, u in [("NSE ~100", closes), ("Global 21", glob)]:
        r = screen.backtest(u)
        rows[(name, uname)] = {k: round(r[k], 3) for k in ["top_annual_return", "universe_annual_return", "excess_annual", "hit_rate", "information_ratio", "top_annual_vol", "universe_annual_vol"]}
print(pd.DataFrame(rows).T.to_string())
