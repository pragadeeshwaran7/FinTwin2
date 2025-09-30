import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import yahooFinance from 'yahoo-finance2';
import axios from 'axios';

const PORT = process.env.PORT || 8080;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://172.17.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'nifty15';
const COLLECTION = process.env.COLLECTION || 'ticks';
const SYMBOLS = (process.env.SYMBOLS || 'RELIANCE.NS,TCS.NS').split(',').filter(Boolean);
const POLL_MS = Number(process.env.POLL_MS || 5000);
const MODEL_ENDPOINTS = {
  lstm: process.env.LSTM_URL || 'http://172.17.0.1:8101/predict',
  gru: process.env.GRU_URL || 'http://172.17.0.1:8102/predict',
};

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

let mongoClient;
let col;

async function initMongo(){
  mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  const db = mongoClient.db(DB_NAME);
  col = db.collection(COLLECTION);
}

async function fetchQuotes(symbols){
  // Generate realistic market data for demonstration
  const docs = [];
  const now = new Date();
  
  for (const s of symbols){
    // Generate realistic price movements
    const basePrice = 1000 + Math.random() * 2000; // Base price between 1000-3000
    const volatility = 0.02 + Math.random() * 0.03; // 2-5% volatility
    const change = (Math.random() - 0.5) * volatility * basePrice;
    
    const close = basePrice + change;
    const open = close + (Math.random() - 0.5) * close * 0.01;
    const high = Math.max(open, close) + Math.random() * close * 0.005;
    const low = Math.min(open, close) - Math.random() * close * 0.005;
    const volume = Math.floor(100000 + Math.random() * 500000);
    
    docs.push({
      symbol: s,
      timestamp: now,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: volume
    });
  }
  
  console.log('Generated', docs.length, 'market data points');
  return docs;
}

function computeVolatility(prices){
  if (prices.length <= 1) return 0;
  const mean = prices.reduce((a,b)=>a+b,0)/prices.length;
  const variance = prices.reduce((a,b)=>a+(b-mean)*(b-mean),0)/prices.length;
  return Math.sqrt(variance);
}

function sma(values, n){
  if (values.length < n) return 0;
  const slice = values.slice(-n);
  return slice.reduce((a,b)=>a+b,0)/n;
}
function ema(values, n){
  if (values.length === 0) return 0;
  const k = 2/(n+1);
  let e = values[0];
  for (let i=1;i<values.length;i++) e = values[i]*k + e*(1-k);
  return e;
}
function roc(values, n){
  if (values.length <= n) return 0;
  const last = values[values.length-1];
  const prev = values[values.length-1-n];
  if (!prev) return 0;
  return (last - prev) / prev;
}

async function latestFeatures(symbol){
  if (!col) {
    // Return mock data if MongoDB not available
    const mockPrice = 1000 + Math.random() * 100;
    return {
      close: mockPrice,
      volume: 1000000,
      volatility: 0.02,
      vwap: mockPrice,
      open: mockPrice * 0.99,
      high: mockPrice * 1.01,
      low: mockPrice * 0.98,
      sma5: mockPrice,
      sma10: mockPrice,
      sma20: mockPrice,
      ema5: mockPrice,
      ema10: mockPrice,
      roc5: 0.01,
      roc10: 0.02,
      ts: new Date()
    };
  }
  
  const docs = await col.find({ symbol }).sort({ timestamp: -1 }).limit(60).toArray();
  docs.reverse();
  const prices = docs.map(d=>d.close);
  const vols = docs.map(d=>d.volume);
  const close = prices.length ? prices[prices.length-1] : 0;
  const volume = vols.reduce((a,b)=>a+b,0);
  const volatility = computeVolatility(prices);
  const vw = (()=>{ const tv = vols.reduce((a,b)=>a+b,0); if (tv<=0) return 0; let s=0; for (let i=0;i<prices.length;i++) s += prices[i]*(vols[i]||0); return s/tv; })();
  const open = docs.length ? Number(docs[docs.length-1].open||0) : (prices[0]||close);
  const high = docs.length ? Math.max(...docs.map(d=>Number(d.high||0)), 0) : Math.max(...prices,0);
  const low = docs.length ? Math.min(...docs.map(d=>Number(d.low||0)), close||0) : Math.min(...prices, close);
  const sma5 = sma(prices,5), sma10 = sma(prices,10), sma20 = sma(prices,20);
  const ema5 = ema(prices,5), ema10 = ema(prices,10);
  const roc5 = roc(prices,5), roc10 = roc(prices,10);
  const ts = docs.length ? docs[docs.length-1].timestamp : new Date();
  return { close, volume, volatility, vwap: vw, open, high, low, sma5, sma10, sma20, ema5, ema10, roc5, roc10, ts };
}

async function predict(features){
  const arr = [
    features.close, features.volume, features.volatility, features.vwap,
    features.open, features.high, features.low, features.sma5, features.sma10,
    features.sma20, features.ema5, features.ema10, features.roc5, features.roc10
  ];
  const preds = {};
  for (const [name, url] of Object.entries(MODEL_ENDPOINTS)){
    try {
      const { data } = await axios.post(url, { features: arr }, { timeout: 1500 });
      preds[name] = Number(data?.prediction ?? 0);
    } catch {
      preds[name] = 0;
    }
  }
  return preds;
}

async function pollLoop(){
  try {
    console.log('Fetching quotes for symbols:', SYMBOLS);
    const quotes = await fetchQuotes(SYMBOLS);
    console.log('Fetched quotes:', quotes.length);
    if (quotes.length && col){
      try {
        await col.insertMany(quotes);
        console.log('Inserted', quotes.length, 'quotes to MongoDB');
      } catch (e) {
        console.log('MongoDB insert failed:', e.message);
      }
    }
    for (const s of SYMBOLS){
      const feat = await latestFeatures(s);
      const preds = await predict(feat);
      console.log('Emitting data for', s, 'close:', feat.close, 'lstm:', preds.lstm, 'gru:', preds.gru);
      io.emit('tick', { symbol: s, ...feat, ...preds });
    }
  } catch (e){
    console.error('poll error', e.message);
  } finally {
    setTimeout(pollLoop, POLL_MS);
  }
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/', (_req, res) => {
  res.sendFile(new URL('../public/index.html', import.meta.url).pathname);
});

io.on('connection', (socket) => {
  socket.emit('hello', { symbols: SYMBOLS });
});

server.listen(PORT, async () => {
  try {
    await initMongo();
    console.log(`mean_server listening on ${PORT}`);
    console.log('Starting data polling...');
    pollLoop();
  } catch (e) {
    console.error('Failed to start:', e.message);
    // Start anyway for testing
    console.log('Starting without MongoDB for testing...');
    pollLoop();
  }
});


