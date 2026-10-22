# FinTwin: financial digital twin

FinTwin is a personal-finance app that learns from your transactions, statements and portfolio, then simulates your financial future. It also includes global market data, honestly validated ML models and a grounded AI assistant. It combines every branch of this repository into one working product. The original research code is kept in [`research/`](research/).

> Nothing in FinTwin is investment advice. Personalised buy/sell recommendations in India require SEBI registration (see the docs below).

## Features

| Area | What it does |
|---|---|
| **Dashboard** | Income, expenses, savings rate, spending trend, categories, 12-month income vs expenses, auto-generated insights, recurring payments, market pulse |
| **Transactions** | Search, filter, sort, paginate, add/edit/delete, CSV export |
| **Upload** | CSV import with automatic column detection (bank statements, UPI exports, household format), preview and de-duplication; **PDF bank statements** parsed in the browser and checked against the running balance |
| **Documents (RAG)** | Upload PDFs; text is chunked, embedded (MiniLM, in a Web Worker) and indexed per user in IndexedDB. Retrieval is hybrid (BM25 + cosine, reciprocal-rank fusion). Only the top passages are sent to the assistant, and answers cite them. |
| **Markets** | Any stock, index, ETF or crypto worldwide (US, UK, India, Europe, Japan and more) via search, charted in its own currency (1D to max); regional overviews, watchlist, and news refreshed every 5 minutes |
| **Turbulence model** | Probability of a high-volatility month for any symbol. Pooled gradient-boosting model trained on 10 global indices and 41 stocks, retrained weekly. |
| **Range outlook** | EWMA volatility bands for the likely price range (replaces a direction forecast that couldn't beat chance) |
| **Stock ideas** | Momentum screen with a 200-day trend filter and turbulence overlay, with its own backtest shown next to the picks. Marked experimental. |
| **Portfolio & QAOA** | Holdings (manual, broker CSV, or Zerodha Kite sync) plus a Quantum Approximate Optimisation Algorithm (Dicke state + XY mixer) that picks the best K-stock basket, compared against random guessing |
| **Your twin** | Learns your income, spending and volatility from your transactions and runs 2,000 Monte Carlo futures with goal probabilities and what-if scenarios |
| **Savings twin** | Benchmarks your categories against 20,000 similar Indian households |
| **AI assistant** | Gemini 2.5 Flash grounded in your transactions, documents, live quotes, news and model outputs, with citations. Falls back to a deterministic rule engine with no key. Per-user history. |
| **Connections** | Zerodha Kite OAuth and sync implemented. Account Aggregator, Plaid and TrueLayer are listed, with the requirements for each. |
| **Settings & security** | Profile, password, TOTP two-factor, active sessions with revoke, security audit log, data export, account deletion |
| **MCP server** | Exposes transactions, analytics, quotes and turbulence risk to MCP clients (e.g. Claude Desktop) |

## Security

- Per-user server-side sessions (`<sessionId>.<hmac>` tokens) with idle (24 h) and absolute (14 d) expiry; each sign-in is its own revocable session.
- Google sign-in (ID token verified against Google's JWKS), scrypt password hashing, password policy, TOTP 2FA (RFC 6238).
- Account lockout (5 failures → 15 min), per-route rate limits, strict CSP and security headers, CORS allow-list.
- Data store encrypted at rest with AES-256-GCM; audit log of security events; GDPR/DPDP-style export and delete.
- User data is isolated per account, including chat history and the in-browser document index.

## Model accuracy (out-of-sample)

| Model | Result |
|---|---|
| Original crash classifier | AUC 0.41–0.59 (chance level). **Replaced.** |
| Turbulence model | Walk-forward AUC 0.71 on indices (NIFTY 0.79), 0.63 on stocks; naive baseline 0.60 / 0.57 |
| Direction forecast | 51.6% vs 51.7% base rate. **Replaced** by range bands: the 80% band covers 79.7% of outcomes. |
| Momentum ideas | India +0.7%/yr excess (not meaningful); global +9.9%/yr (survivorship-biased). Experimental. |
| Savings regression | Training labels were synthetic. **Replaced** by a peer-comparison rule. |
| QAOA | Approximation ratio 0.95–0.99. On 12 assets it finds the optimum 87% of the time vs 43% for random guessing. |

Re-run every evaluation with the scripts in [`ml/experiments/`](ml/experiments/).

## Documentation

- [Technical guide](https://claude.ai/artifact/RzEVGJGPGnoCXjbKRY4DrW): what works, how to run each model, and what is hardcoded or simulated
- [What we need from you](https://claude.ai/artifact/2Vfx8ZWm8hp82N8wEhavqr): keys, Account Aggregator/FIU routes, bank and demat permissions, SEBI, DPDP and the launch checklist

## Architecture

```
frontend/   React 18 + Vite + Tailwind + Recharts; client-side PDF parsing and RAG   → :5173 (dev)
backend/    Express API, encrypted JSON store, Yahoo Finance, Gemini, auth/security  → :5001
ml/         Python models (numpy, pandas, scikit-learn, scipy) called over stdin/stdout
mcp-server/ Model Context Protocol server sharing the backend's services
research/   Original code from every branch (crash-aware pipeline, QLSTM, QAOA, baselines, model serving)
docs/       Sample synthetic bank statement for testing PDF import
```

- No database server: data lives in `backend/data/store.json`, encrypted with a key from `DATA_ENCRYPTION_KEY` or auto-generated at `backend/data/.master.key`.
- Market data comes from Yahoo Finance's chart and search APIs, cached in `ml/data/market/`. The turbulence model is cached in `ml/models/` and trains on first use (about 20 s).

## Quick start

Requirements: **Node.js 18+** (or Bun) and **Python 3.9+**.

```bash
npm run setup                          # backend, frontend, mcp-server and Python deps
cp backend/.env.example backend/.env   # add GEMINI_API_KEY, GOOGLE_CLIENT_ID, KITE_* as available
npm run dev                            # API on :5001 + web app on :5173
```

Open http://localhost:5173 and click **Explore with the demo account** (`demo@fintwin.app` / `demo1234`). It is seeded with 2,461 real Indian household transactions, with dates shifted to end yesterday.

- Single server: `npm start` builds the frontend and serves it from the API at http://localhost:5001.
- With Bun: run `bun install` in `backend/`, `frontend/` and `mcp-server/`, then `bun src/server.js` in `backend/` and `bun run dev` in `frontend/`.

See [`backend/.env.example`](backend/.env.example) for every configuration variable.

## API overview

All routes except `/api/auth/*` and `/api/health` require `Authorization: Bearer <token>`.

| Prefix | Routes |
|---|---|
| `/api/auth` | `register`, `login`, `login/2fa`, `google`, `config`, `me` (GET/PATCH/DELETE), `logout`, `sessions`, `sessions/revoke-others`, `password`, `2fa/setup\|enable\|disable`, `audit`, `export` |
| `/api/transactions` | list with filters, `dashboard`, `import` (CSV or parsed rows), `sample`, `export`, `uploads`, CRUD |
| `/api/markets` | `search`, `overview`, `quote/:symbol`, `history/:symbol?range=`, `news/:symbol`, `market-news`, `watchlist` |
| `/api/ml` | `models`, `crash-risk?ticker=`, `forecast/:ticker`, `optimize`, `ideas?region=`, `savings`, `savings/profile` |
| `/api/portfolio` | `holdings` CRUD + `holdings/import`, `connections`, `connections/kite/login\|callback\|sync` |
| `/api/twin` | `baseline`, `simulate` |
| `/api/chat` | `{ message, history, context.documents }` → grounded answer with citations |

## MCP server

```json
{
  "mcpServers": {
    "fintwin": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/src/index.js"],
      "env": { "FINTWIN_USER_EMAIL": "demo@fintwin.app" }
    }
  }
}
```

Tools: `read_transactions`, `analyze_spending`, `generate_dashboard_data`, `get_stock_quote`, `get_crash_risk`.

## Testing

```bash
npm test                                      # backend: CSV parsing, analytics, API flow, security suite
echo '{}' | python3 ml/fintwin_ml.py health   # check the Python ML runtime
```
