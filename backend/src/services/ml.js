// Bridge to the Python ML layer (ml/fintwin_ml.py). The backend gathers market
// data and pipes it in as JSON on stdin; results come back as JSON on stdout.
import { spawn } from 'child_process';
import path from 'path';
import { config } from '../config.js';
import * as market from './market.js';

export class MLError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export function runPython(command, payload = {}, timeoutMs = 120e3) {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.pythonPath, [path.join(config.mlDir, 'fintwin_ml.py'), command], { cwd: config.mlDir });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new MLError(`ML task '${command}' timed out`, 504));
    }, timeoutMs);
    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new MLError(`Could not start Python (${config.pythonPath}): ${err.message}. Install Python 3 and run: pip install -r ml/requirements.txt`, 503));
    });
    proc.on('close', () => {
      clearTimeout(timer);
      let out;
      try {
        out = JSON.parse(stdout);
      } catch {
        const hint = /ModuleNotFoundError/.test(stderr) ? ' Run: pip install -r ml/requirements.txt' : '';
        return reject(new MLError(`ML task '${command}' failed.${hint} ${stderr.trim().split('\n').slice(-3).join(' ')}`, 503));
      }
      if (!out.ok) {
        if (out.trace) console.error(out.trace);
        return reject(new MLError(out.error, out.trace ? 500 : 422));
      }
      resolve({ ...out.result, elapsed_ms: out.elapsed_ms });
    });
    proc.stdin.end(JSON.stringify(payload));
  });
}

const cache = new Map();
function memo(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const promise = fn();
  cache.set(key, { promise, expires: Date.now() + ttlMs });
  promise.catch(() => cache.delete(key));
  return promise;
}

const live = (h) => {
  if (h.source !== 'yahoo') throw new MLError(`Live data for ${h.symbol} is unavailable (${h.error || 'offline'}); models only run on real market history.`, 503);
  return h.rows;
};

// ---- Risk model warm-up: train the pooled turbulence model in the background at startup ----
let training = null;
export function ensureRiskModel() {
  if (training) return training;
  training = runPython('risk_status', {}, 30e3)
    .then((s) => {
      if (s.trained) return s;
      console.log('[ml] Training the turbulence risk model (first run, ~1 minute; downloads ~50 price histories)…');
      return runPython('train_risk', { force: false }, 15 * 60e3).then((m) => {
        console.log(`[ml] Turbulence model ready: holdout AUC indices ${m.auc_indices?.toFixed(2)}, stocks ${m.auc_stocks?.toFixed(2)}`);
        return m;
      });
    })
    .catch((err) => {
      console.error('[ml] Risk model warm-up failed:', err.message);
      training = null;
      throw err;
    });
  return training;
}

export function crashRisk(symbol = '^NSEI') {
  const sym = symbol.toUpperCase();
  return memo(`risk:${sym}`, 30 * 60e3, async () => {
    await ensureRiskModel();
    const [hist, vix] = await Promise.all([market.history(sym, '5y'), market.history(market.volIndexFor(sym), '5y')]);
    return runPython('crash_risk', { ticker: sym, history: live(hist), vix_history: vix.source === 'yahoo' ? vix.rows : [] });
  });
}

export function forecast(symbol, horizon = 10) {
  const sym = symbol.toUpperCase();
  const h = Math.max(1, Math.min(60, Number(horizon) || 10));
  return memo(`range:${sym}:${h}`, 30 * 60e3, async () => runPython('forecast', { ticker: sym, history: live(await market.history(sym, '5y')), horizon: h }));
}

export async function optimize({ tickers = [], k, budget = 100000, riskAversion = 0.5, layers = 2, shots = 512 }) {
  const unique = [...new Set(tickers.map((t) => String(t).toUpperCase()))].filter(market.isValidSymbol);
  if (unique.length < 2) throw new MLError('Pick at least 2 assets to optimise', 400);
  if (unique.length > 12) throw new MLError('Pick at most 12 assets (12 qubits)', 400);
  const histories = await Promise.all(unique.map((t) => market.history(t, '1y')));
  const assets = histories.map((h) => ({ ticker: h.symbol, name: market.instrument(h.symbol)?.name || h.name || h.symbol, currency: h.currency, closes: live(h).map((r) => r.adjClose ?? r.close) }));
  const currencies = new Set(assets.map((a) => a.currency));
  const result = await runPython('optimize', { assets, k, budget, risk_aversion: riskAversion, layers, shots });
  return { ...result, mixed_currencies: currencies.size > 1 ? [...currencies] : null };
}

export const IDEA_UNIVERSES = { IN: 'Indian large caps', US: 'US mega caps', UK: 'UK large caps', GLOBAL: 'Global leaders' };

export function ideas(region = 'IN', extra = []) {
  const symbols = [
    ...market.STOCKS.filter((s) => (region === 'GLOBAL' ? s.region !== 'IN' : s.region === region || (region === 'UK' && s.region === 'EU'))).map((s) => s.symbol),
    ...extra,
  ];
  const universe = [...new Set(symbols)].slice(0, 30);
  return memo(`ideas:${region}:${universe.join(',')}`, 60 * 60e3, async () => {
    await ensureRiskModel();
    const histories = (await Promise.allSettled(universe.map((s) => market.history(s, '2y')))).filter((r) => r.status === 'fulfilled' && r.value.source === 'yahoo').map((r) => r.value);
    const [inVix, usVix] = await Promise.all([market.history('^INDIAVIX', '2y'), market.history('^VIX', '2y')]);
    const assets = histories.map((h) => ({ ticker: h.symbol, name: market.instrument(h.symbol)?.name || h.name, currency: h.currency, history: h.rows }));
    const out = await runPython('screen', { assets, vix: { '^INDIAVIX': inVix.rows, '^VIX': usVix.rows } }, 180e3);
    return { ...out, region, universe: IDEA_UNIVERSES[region] || 'Custom', generatedAt: new Date().toISOString() };
  });
}

export function savings(profile) {
  return runPython('savings', { profile });
}

export const health = () => memo('health', 5 * 60e3, () => runPython('health', {}, 30e3));
