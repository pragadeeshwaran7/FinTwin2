import os
import sys
import time
from pymongo import MongoClient
import yfinance as yf
from dotenv import load_dotenv
from datetime import datetime
import pytz
import json

# Load environment variables from .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

# List of 15 Indian stocks to track
INDIAN_STOCKS = [
    "RELIANCE.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", "TCS.NS",
    "HINDUNILVR.NS", "BHARTIARTL.NS", "ITC.NS", "LT.NS", "AXISBANK.NS",
    "KOTAKBANK.NS", "MARUTI.NS", "M&M.NS", "HCLTECH.NS", "SUNPHARMA.NS"
]

# Store the stocks in a JSON file for the frontend
stocks_file_path = os.path.join(os.path.dirname(__file__), '..', 'stocks.json')
with open(stocks_file_path, 'w') as f:
    json.dump(INDIAN_STOCKS, f)

def is_market_open():
    """Checks if the Indian stock market (NSE) is open."""
    tz = pytz.timezone('Asia/Kolkata')
    now = datetime.now(tz)
    market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)
    return market_open <= now <= market_close and now.weekday() < 5

def get_stock_price(ticker):
    """Fetches the current stock price for a given ticker."""
    try:
        stock = yf.Ticker(ticker)
        price = stock.info.get('regularMarketPrice')
        if price is None:
            price = stock.info.get('currentPrice')
        
        if price is None:
            print(f"Error: Could not retrieve price for {ticker}. Please check the ticker symbol.")
            return None
        return price
    except Exception as e:
        print(f"Error fetching live data for {ticker} from yfinance: {e}")
        return None

def store_live_price_in_db(db, ticker, price):
    """Stores the ticker, price, and timestamp in the live_data collection."""
    try:
        collection = db.get_collection("live_data")
        doc = {
            "ticker": ticker.upper(),
            "price": price,
            "timestamp": datetime.utcnow(),
        }
        collection.insert_one(doc)
        print(f"Successfully stored live {ticker.upper()} price ({price}) in MongoDB.")
    except Exception as e:
        print(f"Error inserting live data: {e}")

def get_and_store_historical_data(db, ticker, period):
    """Fetches and stores historical data for a given ticker, including drawdown."""
    try:
        print(f"Fetching historical data for {ticker} for the period of {period}...")
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)

        if hist.empty:
            print(f"No historical data found for {ticker} for the period {period}.")
            return

        # Calculate Drawdown
        peak = hist['High'].cummax()
        drawdown = (hist['Close'] - peak) / peak
        hist['Drawdown'] = drawdown

        collection = db.get_collection("historical_data")
        
        # Clear old data for this ticker to avoid duplicates
        collection.delete_many({'ticker': ticker.upper()})

        records = hist.reset_index().to_dict('records')
        documents = []
        for record in records:
            documents.append({
                "ticker": ticker.upper(),
                "date": record['Date'],
                "open": record['Open'],
                "high": record['High'],
                "low": record['Low'],
                "close": record['Close'],
                "volume": record['Volume'],
                "drawdown": record['Drawdown']
            })
        
        collection.insert_many(documents)
        print(f"Successfully stored {len(documents)} historical records for {ticker.upper()} in MongoDB.")

    except Exception as e:
        print(f"Error fetching or storing historical data: {e}")

if __name__ == "__main__":
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("Error: MONGO_URI not found in .env file.")
        sys.exit(1)

    client = None  # Initialize client to None
    try:
        client = MongoClient(mongo_uri)
        db = client.get_database("fintwin")

        # --- Initial Data Fetch ---
        # Fetch historical data for all stocks once at the beginning.
        print("--- Starting initial historical data fetch for all stocks. ---")
        for ticker in INDIAN_STOCKS:
            get_and_store_historical_data(db, ticker, period='1y')
        print("--- Initial historical data fetch complete. ---")

        # --- Real-time Data Fetch Loop ---
        print("\n--- Starting real-time data fetching loop (every 10 seconds). Press Ctrl+C to stop. ---")
        while True:
            if is_market_open():
                for ticker in INDIAN_STOCKS:
                    price = get_stock_price(ticker)
                    if price is not None:
                        store_live_price_in_db(db, ticker, price)
                
                print(f"\nFinished fetching live data for all tickers. Waiting for 10 seconds...\n")
                time.sleep(10)
            else:
                print("Market is closed. No data will be fetched. Waiting for 1 minute.")
                time.sleep(60)

    except KeyboardInterrupt:
        print("\nScript interrupted by user. Shutting down.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if client:
            client.close()
            print("MongoDB connection closed.")
