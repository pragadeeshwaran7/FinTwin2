import express from 'express';
import { requireAuth } from '../auth.js';
import { db } from '../store.js';
import * as ml from '../services/ml.js';
import * as market from '../services/market.js';
import { savingsProfile } from '../services/finance.js';
import { rateLimit } from '../security.js';

const router = express.Router();
router.use(requireAuth);
router.use(rateLimit({ windowMs: 60e3, max: 40, key: (req) => `ml:${req.user.id}`, message: 'Too many model requests. Wait a minute.' }));

const wrap = (fn) => async (req, res) => {
  try {
    res.json({ success: true, data: await fn(req) });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

const checkSymbol = (symbol) => {
  const s = String(symbol || '').toUpperCase();
  if (!market.isValidSymbol(s)) throw new ml.MLError(`Invalid symbol ${symbol}`, 400);
  return s;
};

// Accuracy figures come from ml/experiments/ (walk-forward, out-of-sample). See docs.
export const MODEL_CATALOG = [
  {
    key: 'crash_risk', name: 'Turbulence risk model (v2)', page: '/markets', status: 'validated',
    description: 'Gradient boosting trained on a pooled dataset of 10 global indices (2000+) and 41 large caps. It predicts whether the next 20 sessions will be unusually volatile for that asset. Works for any stock or index.',
    accuracy: 'Walk-forward AUC 0.71 on indices (NIFTY 0.79), 0.63 on stocks, vs 0.60 / 0.57 for a naive volatility rule.',
    origin: 'fixit-indian-stock / fixit-stock / QLSTM (crash-aware). v1 crash target was not predictable (AUC ~0.5) and was replaced.',
  },
  {
    key: 'forecast', name: 'Price range outlook', page: '/markets', status: 'validated',
    description: 'EWMA (RiskMetrics) volatility bands for the next 1 to 60 sessions. It gives a range, not a target price.',
    accuracy: 'Out-of-sample 2019+ on 42 stocks: the 80% band held 79.7% of 10-day outcomes. Direction prediction was tested on 41 stocks and matched chance (51.6% vs 51.7% base rate), so it was dropped.',
    origin: 'QLSTM / trial-1 (LSTM, GRU, TCN, RF forecasters)',
  },
  {
    key: 'ideas', name: 'Stock ideas screen', page: '/ideas', status: 'experimental',
    description: 'Ranks stocks by 12-1 month momentum, requires an uptrend (above the 200-day average) for a "consider" flag, and penalises stocks the turbulence model expects to be rough.',
    accuracy: 'Backtest 2017 to 2026, top third vs equal weight: India +0.7%/yr (no meaningful edge), global mega caps +9.9%/yr (survivorship-biased).',
    origin: 'New in v2',
  },
  {
    key: 'optimize', name: 'QAOA portfolio optimiser', page: '/portfolio', status: 'validated',
    description: 'Mean-variance selection of K of N assets with QAOA (Dicke state, XY mixer, INTERP warm start), simulated exactly on a statevector, with 512 measurement shots.',
    accuracy: 'Approximation ratio 0.95 to 0.99 before sampling. 12 assets: finds the true optimum 87% of the time vs 43% for random guessing with the same shots.',
    origin: 'qaoa branch (PennyLane QAOA)',
  },
  {
    key: 'savings', name: 'Savings twin', page: '/savings', status: 'rule-based',
    description: 'Compares your budget with households of similar income, city tier and occupation (20,000 Indian budgets) and flags spending above peers.',
    accuracy: 'The dataset\'s savings labels turned out to be synthetic noise (a fixed-share rule beat the ML model, R² 0.72 vs 0.64), so this is a transparent peer benchmark, not a trained model.',
    origin: 'trial-1 datasets; webapp savings models',
  },
];

router.get('/models', wrap(async () => {
  let runtime;
  try {
    runtime = { ok: true, ...(await ml.health()) };
  } catch (err) {
    runtime = { ok: false, error: err.message };
  }
  let risk = null;
  try {
    risk = await Promise.race([ml.ensureRiskModel(), new Promise((r) => setTimeout(() => r(null), 2000))]);
  } catch {
    /* reported via runtime */
  }
  return { runtime, riskModel: risk, models: MODEL_CATALOG };
}));

router.get('/crash-risk', wrap((req) => ml.crashRisk(checkSymbol(req.query.ticker || '^NSEI'))));
router.get('/forecast/:ticker', wrap((req) => ml.forecast(checkSymbol(req.params.ticker), req.query.horizon)));

router.post('/optimize', wrap((req) => {
  const { tickers = [], k, budget, riskAversion, layers } = req.body || {};
  tickers.forEach(checkSymbol);
  return ml.optimize({ tickers, k: Number(k) || undefined, budget: Number(budget) || 100000, riskAversion: Number(riskAversion ?? 0.5), layers: Math.min(4, Number(layers) || 2) });
}));

router.get('/ideas', wrap((req) => {
  const region = ['IN', 'US', 'UK', 'GLOBAL'].includes(req.query.region) ? req.query.region : 'IN';
  const extra = req.query.watchlist === '1' ? db.watchlist(req.user.id).filter((s) => !s.startsWith('^')) : [];
  return ml.ideas(region, extra);
}));

router.get('/savings/profile', wrap(async (req) => ({ ...req.user.profile, ...savingsProfile(db.transactions(req.user.id)) })));
router.post('/savings', wrap((req) => ml.savings(req.body?.profile || req.body)));

export default router;
