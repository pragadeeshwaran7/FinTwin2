import express from 'express';
import { requireAuth } from '../auth.js';
import { db } from '../store.js';
import { learnBehaviour, simulate } from '../services/twin.js';
import * as market from '../services/market.js';

const router = express.Router();
router.use(requireAuth);

router.get('/baseline', async (req, res) => {
  const behaviour = learnBehaviour(db.transactions(req.user.id));
  const holdings = db.holdings(req.user.id);
  const quotes = await market.quotes([...new Set(holdings.map((h) => h.symbol))]).catch(() => []);
  const inrHoldings = holdings.reduce((s, h) => {
    const q = quotes.find((x) => x.symbol === h.symbol);
    return s + (q && q.currency === 'INR' ? q.price * h.quantity : 0);
  }, 0);
  res.json({ success: true, data: { behaviour, holdingsValue: Math.round(inrHoldings), goals: req.user.profile?.goals || [] } });
});

router.post('/simulate', (req, res) => {
  try {
    res.json({ success: true, data: simulate(req.body || {}) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
