from collections import deque
import numpy as np

class TickAggregator:
    def __init__(self, window=60):
        self.buf = deque(maxlen=window)
    def add(self, tick):
        self.buf.append(tick)
    def ohlcv(self):
        if not self.buf:
            return {
              "open": 0.0, "high": 0.0, "low": 0.0, "close": 0.0,
              "volume": 0.0, "vwap": 0.0, "volatility": 0.0
            }
        prices = [float(t.get("close", 0.0)) for t in self.buf]
        vols   = [float(t.get("volume", 0.0)) for t in self.buf]
        total_volume = sum(vols)
        vwap = (sum(p*v for p, v in zip(prices, vols)) / total_volume) if total_volume > 0 else 0.0
        return {
          "open": prices[0], "high": max(prices),
          "low": min(prices), "close": prices[-1],
          "volume": total_volume,
          "vwap": vwap,
          "volatility": float(np.std(prices))
        }
