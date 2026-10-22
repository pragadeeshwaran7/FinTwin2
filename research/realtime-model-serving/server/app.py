# app.py
import os, asyncio
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
import json
from preprocessing.aggregator import TickAggregator
from preprocessing.processor import FeatureProcessor
from starlette.websockets import WebSocket

app = FastAPI()
if os.path.isdir("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO = AsyncIOMotorClient(mongo_url)["nifty15"]["ticks"]
MODEL_ENDPOINTS = {
  "lstm": "http://lstm_model:8000/predict",
  "gru":  "http://gru_model:8000/predict"
}
symbols_csv = os.getenv("SYMBOLS", "RELIANCE.NS,TCS.NS")
aggregators = {sym: TickAggregator() for sym in symbols_csv.split(",") if sym}
processor = FeatureProcessor()

@app.get("/", response_class=HTMLResponse)
async def index():
    with open("templates/dashboard.html") as f:
        return f.read()

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    while True:
        for sym, agg in aggregators.items():
            docs = await MONGO.find({"symbol": sym}) \
                               .sort("timestamp", -1).to_list(60)
            docs.reverse()
            for d in docs:
                agg.add(d)
            feat = agg.ohlcv()
            arr = [[feat["close"], feat["volume"], feat["volatility"]]]
            try:
                proc = processor.transform(arr)[0].tolist()
            except Exception:
                proc = arr[0]
            # call both models
            preds = {}
            async with httpx.AsyncClient(timeout=2.0) as client:
                for name, url in MODEL_ENDPOINTS.items():
                    try:
                        res = await client.post(url, json={"features": proc})
                        data = res.json()
                        preds[name] = float(data.get("prediction", 0.0))
                    except Exception:
                        preds[name] = 0.0
            payload = {"symbol":sym, **feat, **preds}
            await ws.send_text(json.dumps(payload))
        await asyncio.sleep(5)
