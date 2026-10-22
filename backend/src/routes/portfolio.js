// Holdings (demat / broker portfolio) and external account connections.
//
// Implemented now:
//   * Holdings import from broker CSV exports (Zerodha Console, Groww, Upstox, generic) and manual edits
//   * Zerodha Kite Connect: full OAuth login + holdings sync (needs KITE_API_KEY / KITE_API_SECRET)
// Scaffolded, needs regulatory onboarding first (see docs):
//   * RBI Account Aggregator (bank savings/current accounts, deposits, 3 years of transactions, CDSL/NSDL demat)
//   * Plaid (US) / TrueLayer (UK) open banking
import crypto from 'crypto';
import express from 'express';
import { requireAuth, audit } from '../auth.js';
import { config } from '../config.js';
import { db, newId } from '../store.js';
import { parseCsv } from '../services/csv.js';
import * as market from '../services/market.js';

const router = express.Router();
const fail = (res, status, message) => res.status(status).json({ success: false, message });

const PROVIDERS = [
  {
    id: 'kite', name: 'Zerodha Kite Connect', kind: 'broker', region: 'IN', covers: ['Demat holdings', 'Positions', 'Mutual funds (Coin)'],
    configured: () => Boolean(config.kite.apiKey && config.kite.apiSecret), needs: 'KITE_API_KEY and KITE_API_SECRET from developers.kite.trade (Connect plan, about ₹500/month).',
  },
  {
    id: 'account_aggregator', name: 'Account Aggregator (Setu / Finvu / OneMoney)', kind: 'bank', region: 'IN',
    covers: ['Savings & current accounts', 'Fixed & recurring deposits', 'Up to 3+ years of transactions (per consent)', 'Demat holdings via CDSL/NSDL', 'Mutual funds via CAMS/KFintech'],
    configured: () => Boolean(process.env.AA_CLIENT_ID && process.env.AA_CLIENT_SECRET), needs: 'Registration as a Financial Information User (FIU) with your sector regulator and an AA partnership (e.g. Setu, Finvu). See the requirements document.',
  },
  {
    id: 'plaid', name: 'Plaid', kind: 'bank', region: 'US', covers: ['US bank accounts', 'Transactions (24 months)', 'Brokerage holdings'],
    configured: () => Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET), needs: 'Plaid account and production approval.',
  },
  {
    id: 'truelayer', name: 'TrueLayer', kind: 'bank', region: 'UK', covers: ['UK/EU bank accounts', 'Transactions'],
    configured: () => Boolean(process.env.TRUELAYER_CLIENT_ID && process.env.TRUELAYER_CLIENT_SECRET), needs: 'TrueLayer account (FCA-authorised AISP).',
  },
];

// ---- Holdings ----
const HOLDING_COLS = {
  symbol: [/^(instrument|symbol|tradingsymbol|scrip|stock|ticker|company|security name)$/i],
  quantity: [/^(qty\.?|quantity|shares|units|holding qty)$/i],
  avgPrice: [/^(avg\.? ?cost|average price|avg\.? ?price|buy price|average_price|avg buy price)$/i],
  exchange: [/^exchange$/i],
  isin: [/^isin$/i],
};

function parseHoldingsCsv(text, defaultSuffix = '.NS') {
  const rows = parseCsv(text);
  if (rows.length < 2) return { holdings: [], errors: ['File has no data rows'] };
  const headers = rows[0].map((h) => h.trim());
  const col = Object.fromEntries(Object.entries(HOLDING_COLS).map(([k, pats]) => [k, headers.findIndex((h) => pats.some((p) => p.test(h)))]));
  if (col.symbol < 0 || col.quantity < 0) return { holdings: [], errors: ['Need at least a symbol/instrument and a quantity column'] };
  const holdings = [];
  for (const r of rows.slice(1)) {
    const raw = String(r[col.symbol] || '').trim().toUpperCase();
    const quantity = Number(String(r[col.quantity] || '').replace(/,/g, ''));
    if (!raw || !Number.isFinite(quantity) || quantity <= 0) continue;
    const exch = col.exchange >= 0 ? String(r[col.exchange]).toUpperCase() : '';
    const symbol = raw.includes('.') || raw.startsWith('^') ? raw : `${raw}${exch === 'BSE' ? '.BO' : exch && exch !== 'NSE' ? '' : defaultSuffix}`;
    holdings.push({
      id: newId(), symbol, quantity,
      avgPrice: col.avgPrice >= 0 ? Number(String(r[col.avgPrice]).replace(/[^0-9.]/g, '')) || null : null,
      isin: col.isin >= 0 ? r[col.isin] : undefined, source: 'csv',
    });
  }
  return { holdings, errors: [] };
}

async function valued(userId) {
  const list = db.holdings(userId);
  const quotes = await market.quotes([...new Set(list.map((h) => h.symbol))]);
  const bySym = new Map(quotes.map((q) => [q.symbol, q]));
  const rows = list.map((h) => {
    const q = bySym.get(h.symbol);
    const value = q ? q.price * h.quantity : null;
    const cost = h.avgPrice ? h.avgPrice * h.quantity : null;
    return { ...h, name: q?.name || h.symbol, price: q?.price ?? null, currency: q?.currency, changePercent: q?.changePercent ?? null, value, cost, pnl: value !== null && cost !== null ? value - cost : null, dayPnl: q ? (q.change || 0) * h.quantity : null };
  });
  const byCur = {};
  for (const r of rows) {
    if (r.value === null) continue;
    const c = (byCur[r.currency || '?'] ||= { currency: r.currency, value: 0, cost: 0, dayPnl: 0 });
    c.value += r.value;
    c.cost += r.cost || 0;
    c.dayPnl += r.dayPnl || 0;
  }
  return { holdings: rows, totals: Object.values(byCur) };
}

router.get('/connections/kite/callback', async (req, res) => {
  // Browser redirect from Zerodha after login. Authenticated via the signed `state` we sent.
  const back = (q) => res.redirect(`${config.allowedOrigins[0] || ''}/connections?${q}`);
  try {
    const [payload, sig] = String(req.query.state || '').split('.');
    const expected = crypto.createHmac('sha256', db.secret).update(`kite:${payload}`).digest('base64url');
    if (!payload || sig !== expected) return back('error=invalid_state');
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (exp < Date.now() || !db.findUserById(uid)) return back('error=expired');
    if (req.query.status !== 'success' || !req.query.request_token) return back('error=denied');
    const checksum = crypto.createHash('sha256').update(config.kite.apiKey + req.query.request_token + config.kite.apiSecret).digest('hex');
    const r = await fetch('https://api.kite.trade/session/token', {
      method: 'POST', headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ api_key: config.kite.apiKey, request_token: String(req.query.request_token), checksum }),
    });
    const body = await r.json();
    if (!r.ok) return back(`error=${encodeURIComponent(body.message || 'kite_error')}`);
    const conns = db.connections(uid).filter((c) => c.provider !== 'kite');
    conns.push({ id: newId(), provider: 'kite', accountId: body.data.user_id, accountName: body.data.user_name, accessToken: body.data.access_token, connectedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 20 * 3600e3).toISOString() });
    db.setConnections(uid, conns);
    db.addAudit(uid, { at: new Date().toISOString(), event: 'connection_added', provider: 'kite' });
    back('connected=kite');
  } catch (err) {
    back(`error=${encodeURIComponent(err.message)}`);
  }
});

router.use(requireAuth);

router.get('/holdings', async (req, res) => res.json({ success: true, data: await valued(req.user.id) }));

router.post('/holdings/import', (req, res) => {
  const { content = '', replace = false, suffix = '.NS' } = req.body || {};
  const { holdings, errors } = parseHoldingsCsv(content, ['.NS', '.BO', ''].includes(suffix) ? suffix : '.NS');
  if (!holdings.length) return fail(res, 400, errors[0] || 'No holdings found in the file');
  const merged = replace ? holdings : [...db.holdings(req.user.id).filter((h) => !holdings.some((n) => n.symbol === h.symbol)), ...holdings];
  db.setHoldings(req.user.id, merged);
  audit(req, req.user.id, 'holdings_imported', { count: holdings.length });
  res.json({ success: true, imported: holdings.length });
});

router.post('/holdings', (req, res) => {
  const symbol = String(req.body?.symbol || '').toUpperCase();
  const quantity = Number(req.body?.quantity);
  if (!market.isValidSymbol(symbol) || !(quantity > 0)) return fail(res, 400, 'Enter a valid symbol and quantity');
  const avgPrice = Number(req.body?.avgPrice) || null;
  const list = db.holdings(req.user.id).filter((h) => h.symbol !== symbol);
  list.push({ id: newId(), symbol, quantity, avgPrice, source: 'manual' });
  db.setHoldings(req.user.id, list);
  res.status(201).json({ success: true });
});

router.delete('/holdings/:id', (req, res) => {
  db.setHoldings(req.user.id, db.holdings(req.user.id).filter((h) => h.id !== req.params.id));
  res.json({ success: true });
});

router.get('/connections', (req, res) => {
  const mine = db.connections(req.user.id);
  res.json({
    success: true,
    data: PROVIDERS.map(({ configured, ...p }) => {
      const c = mine.find((x) => x.provider === p.id);
      return { ...p, configured: configured(), connected: Boolean(c), connection: c ? { accountId: c.accountId, accountName: c.accountName, connectedAt: c.connectedAt, expiresAt: c.expiresAt, lastSyncAt: c.lastSyncAt } : null };
    }),
  });
});

router.get('/connections/kite/login', (req, res) => {
  if (!config.kite.apiKey) return fail(res, 400, 'Kite Connect is not configured on this server (KITE_API_KEY / KITE_API_SECRET).');
  const payload = Buffer.from(JSON.stringify({ uid: req.user.id, exp: Date.now() + 10 * 60e3, n: newId() })).toString('base64url');
  const state = `${payload}.${crypto.createHmac('sha256', db.secret).update(`kite:${payload}`).digest('base64url')}`;
  const url = `https://kite.zerodha.com/connect/login?v=3&api_key=${encodeURIComponent(config.kite.apiKey)}&redirect_params=${encodeURIComponent(`state=${state}`)}`;
  res.json({ success: true, url });
});

router.post('/connections/kite/sync', async (req, res) => {
  const conn = db.connections(req.user.id).find((c) => c.provider === 'kite');
  if (!conn) return fail(res, 400, 'Connect Zerodha first');
  if (Date.parse(conn.expiresAt) < Date.now()) return fail(res, 401, 'Your Zerodha session expired (Kite tokens last one trading day). Reconnect.');
  const r = await fetch('https://api.kite.trade/portfolio/holdings', { headers: { 'X-Kite-Version': '3', Authorization: `token ${config.kite.apiKey}:${conn.accessToken}` } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) return fail(res, r.status === 403 ? 401 : 502, body.message || 'Kite request failed');
  const holdings = (body.data || []).map((h) => ({ id: newId(), symbol: `${h.tradingsymbol}${h.exchange === 'BSE' ? '.BO' : '.NS'}`, quantity: h.quantity + (h.t1_quantity || 0), avgPrice: h.average_price, isin: h.isin, source: 'kite' }));
  db.setHoldings(req.user.id, [...db.holdings(req.user.id).filter((h) => h.source !== 'kite'), ...holdings]);
  conn.lastSyncAt = new Date().toISOString();
  db.setConnections(req.user.id, db.connections(req.user.id));
  audit(req, req.user.id, 'holdings_synced', { provider: 'kite', count: holdings.length });
  res.json({ success: true, imported: holdings.length });
});

router.delete('/connections/:provider', (req, res) => {
  db.setConnections(req.user.id, db.connections(req.user.id).filter((c) => c.provider !== req.params.provider));
  audit(req, req.user.id, 'connection_removed', { provider: req.params.provider });
  res.json({ success: true });
});

export default router;
