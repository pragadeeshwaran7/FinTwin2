import express from 'express';
import { requireAuth } from '../auth.js';
import { db } from '../store.js';
import * as market from '../services/market.js';

const router = express.Router();
router.use(requireAuth);

const wrap = (fn) => async (req, res) => {
  try {
    res.json({ success: true, data: await fn(req) });
  } catch (err) {
    res.status(err.status || 502).json({ success: false, message: err.message });
  }
};
const symbolParam = (req) => {
  const s = String(req.params.symbol || req.query.symbol || '').toUpperCase();
  if (!market.isValidSymbol(s)) {
    const err = new Error('Invalid symbol');
    err.status = 400;
    throw err;
  }
  return s;
};

router.get('/stocks', (_req, res) => {
  const strip = ({ aliases, ...rest }) => rest;
  res.json({ success: true, stocks: market.STOCKS.map(strip), indices: market.INDICES.map(strip), marketState: market.marketState('IN') });
});

router.get('/overview', wrap((req) => market.overview(['IN', 'US', 'UK', 'EU', 'JP', 'HK', 'AU', 'ALL'].includes(req.query.region) ? req.query.region : 'IN')));
router.get('/search', wrap((req) => market.search(req.query.q)));
router.get('/quote/:symbol', wrap((req) => market.quote(symbolParam(req))));
router.get('/history/:symbol', wrap((req) => market.history(symbolParam(req), market.RANGES[req.query.range] ? req.query.range : '1y')));
router.get('/news/:symbol', wrap((req) => market.news(symbolParam(req))));
router.get('/market-news', wrap((req) => market.marketNews(['IN', 'US', 'UK', 'ALL'].includes(req.query.region) ? req.query.region : 'IN')));

router.get('/watchlist', wrap(async (req) => {
  const symbols = db.watchlist(req.user.id);
  return { symbols, quotes: await market.quotes(symbols) };
}));

router.put('/watchlist', wrap(async (req) => {
  const symbols = [...new Set((req.body?.symbols || []).map((s) => String(s).toUpperCase()))].filter(market.isValidSymbol).slice(0, 40);
  db.setWatchlist(req.user.id, symbols);
  return { symbols };
}));

export default router;
