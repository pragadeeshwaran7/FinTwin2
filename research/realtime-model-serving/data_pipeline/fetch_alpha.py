# fetch_alpha.py
import os, time, json
import requests
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
SYMBOLS = [
  "RELIANCE.NS","TCS.NS","HDFCBANK.NS","ICICIBANK.NS",
  "INFY.NS","KOTAKBANK.NS","LT.NS","SBIN.NS",
  "AXISBANK.NS","HINDUNILVR.NS","HCLTECH.NS","BAJFINANCE.NS",
  "ITC.NS","BHARTIARTL.NS","MARUTI.NS"
]

client = MongoClient("mongodb://mongo:27017/")
db = client["nifty15"]
col = db["ticks"]

def fetch(symbol):
    url = (f"https://www.alphavantage.co/query"
           f"?function=TIME_SERIES_INTRADAY"
           f"&symbol={symbol}&interval=1min"
           f"&outputsize=compact&apikey={API_KEY}")
    data = requests.get(url).json().get("Time Series (1min)", {})
    docs = []
    for ts,val in data.items():
        docs.append({
          "symbol": symbol,
          "timestamp": datetime.fromisoformat(ts),
          "open": float(val["1. open"]),
          "high": float(val["2. high"]),
          "low": float(val["3. low"]),
          "close": float(val["4. close"]),
          "volume": int(val["5. volume"])
        })
    if docs:
        col.insert_many(docs)

if __name__=="__main__":
    while True:
        for s in SYMBOLS:
            fetch(s)
            time.sleep(12)     # respect 5req/min
        time.sleep(60)
