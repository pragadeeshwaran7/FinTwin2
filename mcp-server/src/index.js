#!/usr/bin/env node
// FinTwin MCP server (from the keers branch), now backed by real data: it reads
// the same datastore and services as the FinTwin backend, so MCP clients such
// as Claude Desktop can query a user's transactions and live NSE markets.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { db } from '../../backend/src/store.js';
import * as finance from '../../backend/src/services/finance.js';
import * as market from '../../backend/src/services/market.js';
import * as ml from '../../backend/src/services/ml.js';

const USER_EMAIL = process.env.FINTWIN_USER_EMAIL || 'demo@fintwin.app';

function currentUser() {
  const user = db.findUserByEmail(USER_EMAIL);
  if (!user) throw new Error(`No FinTwin user ${USER_EMAIL}. Start the backend once (it seeds the demo user) or set FINTWIN_USER_EMAIL.`);
  return user;
}

const RANGE = { type: 'string', enum: Object.keys(finance.RANGES), description: 'Time range (default 30d)' };
const TOOLS = [
  {
    name: 'read_transactions',
    description: "Read the user's transactions with optional filters",
    inputSchema: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        dateTo: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        category: { type: 'string', description: 'Exact category name' },
        search: { type: 'string', description: 'Text search in description/category' },
        type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
        limit: { type: 'number', description: 'Maximum rows (default 50, max 500)' },
      },
    },
  },
  { name: 'analyze_spending', description: 'Spending metrics, category breakdown and insights for a period', inputSchema: { type: 'object', properties: { range: RANGE } } },
  { name: 'generate_dashboard_data', description: 'Full dashboard payload (metrics, charts, recent transactions, recurring payments)', inputSchema: { type: 'object', properties: { range: RANGE } } },
  {
    name: 'get_stock_quote',
    description: 'Live quote and recent headlines for any stock, index, ETF or crypto worldwide (e.g. RELIANCE.NS, AAPL, VOD.L, ^NSEI) or a company name',
    inputSchema: { type: 'object', properties: { symbol: { type: 'string' } }, required: ['symbol'] },
  },
  {
    name: 'get_crash_risk',
    description: 'Turbulence risk (probability the next 20 sessions are unusually volatile) for any stock or index, with drivers and suggested action',
    inputSchema: { type: 'object', properties: { symbol: { type: 'string', description: 'Defaults to ^NSEI' } } },
  },
];

const text = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });

async function call(name, args = {}) {
  switch (name) {
    case 'read_transactions': {
      const txns = finance.filterTransactions(db.transactions(currentUser().id), { from: args.dateFrom, to: args.dateTo, category: args.category, search: args.search, type: args.type });
      const rows = finance.sortTransactions(txns).slice(0, Math.min(500, args.limit || 50));
      return { total: txns.length, returned: rows.length, data: rows.map(({ id, source, ...t }) => t) };
    }
    case 'analyze_spending': {
      const d = finance.dashboard(db.transactions(currentUser().id), { range: args.range || '30d' });
      return { range: d.range, metrics: d.metrics, changes: d.changes, categories: d.categories, insights: d.insights };
    }
    case 'generate_dashboard_data':
      return finance.dashboard(db.transactions(currentUser().id), { range: args.range || '30d' });
    case 'get_stock_quote': {
      const sym = String(args.symbol || '').toUpperCase();
      const symbol = market.isValidSymbol(sym) && (market.instrument(sym) || sym.includes('.') || sym.startsWith('^')) ? sym : (await market.search(args.symbol))[0]?.symbol;
      if (!symbol) throw new Error(`No market found for "${args.symbol}"`);
      const [{ intraday, ...quote }, news] = await Promise.all([market.quote(symbol), market.news(symbol)]);
      return { ...quote, news: news.items.slice(0, 5) };
    }
    case 'get_crash_risk': {
      const { timeline, ...risk } = await ml.crashRisk(args.symbol || '^NSEI');
      return risk;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const server = new Server({ name: 'fintwin-mcp-server', version: '2.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    return text(await call(req.params.name, req.params.arguments));
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: err.message }] };
  }
});

await server.connect(new StdioServerTransport());
console.error(`FinTwin MCP server running on stdio (user: ${USER_EMAIL})`);
