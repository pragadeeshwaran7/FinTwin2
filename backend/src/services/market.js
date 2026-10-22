// Global market data from Yahoo Finance (chart + search APIs) and Google News.
// Any Yahoo symbol works: RELIANCE.NS, AAPL, VOD.L, 7203.T, SAP.DE, BTC-USD, ^GSPC…
// Responses are cached in memory; when Yahoo is unreachable a clearly flagged
// simulated series is returned so the UI still renders (models refuse to use it).

const S = (symbol, name, sector, region, aliases = []) => ({ symbol, name, sector, region, aliases });

export const STOCKS = [
  S('RELIANCE.NS', 'Reliance Industries', 'Energy', 'IN', ['reliance', 'ril']),
  S('TCS.NS', 'Tata Consultancy Services', 'IT', 'IN', ['tcs', 'tata consultancy']),
  S('HDFCBANK.NS', 'HDFC Bank', 'Banking', 'IN', ['hdfc', 'hdfc bank']),
  S('ICICIBANK.NS', 'ICICI Bank', 'Banking', 'IN', ['icici']),
  S('INFY.NS', 'Infosys', 'IT', 'IN', ['infosys', 'infy']),
  S('HINDUNILVR.NS', 'Hindustan Unilever', 'FMCG', 'IN', ['hindustan unilever', 'hul']),
  S('BHARTIARTL.NS', 'Bharti Airtel', 'Telecom', 'IN', ['airtel', 'bharti']),
  S('ITC.NS', 'ITC', 'FMCG', 'IN', ['itc']),
  S('LT.NS', 'Larsen & Toubro', 'Infrastructure', 'IN', ['larsen', 'l&t']),
  S('AXISBANK.NS', 'Axis Bank', 'Banking', 'IN', ['axis bank']),
  S('KOTAKBANK.NS', 'Kotak Mahindra Bank', 'Banking', 'IN', ['kotak']),
  S('MARUTI.NS', 'Maruti Suzuki', 'Auto', 'IN', ['maruti']),
  S('M&M.NS', 'Mahindra & Mahindra', 'Auto', 'IN', ['mahindra', 'm&m']),
  S('HCLTECH.NS', 'HCL Technologies', 'IT', 'IN', ['hcl']),
  S('SUNPHARMA.NS', 'Sun Pharmaceutical', 'Pharma', 'IN', ['sun pharma', 'sunpharma']),
  S('SBIN.NS', 'State Bank of India', 'Banking', 'IN', ['sbi', 'state bank']),
  S('BAJFINANCE.NS', 'Bajaj Finance', 'Finance', 'IN', ['bajaj finance']),
  S('TITAN.NS', 'Titan Company', 'Consumer', 'IN', ['titan']),
  S('WIPRO.NS', 'Wipro', 'IT', 'IN', ['wipro']),
  S('ASIANPAINT.NS', 'Asian Paints', 'Consumer', 'IN', ['asian paints']),
  S('AAPL', 'Apple', 'Technology', 'US', ['apple']),
  S('MSFT', 'Microsoft', 'Technology', 'US', ['microsoft']),
  S('NVDA', 'NVIDIA', 'Semiconductors', 'US', ['nvidia']),
  S('AMZN', 'Amazon', 'Consumer', 'US', ['amazon']),
  S('GOOGL', 'Alphabet', 'Technology', 'US', ['google', 'alphabet']),
  S('META', 'Meta Platforms', 'Technology', 'US', ['meta', 'facebook']),
  S('TSLA', 'Tesla', 'Auto', 'US', ['tesla']),
  S('JPM', 'JPMorgan Chase', 'Banking', 'US', ['jpmorgan', 'jp morgan']),
  S('HSBA.L', 'HSBC Holdings', 'Banking', 'UK', ['hsbc']),
  S('SHEL.L', 'Shell', 'Energy', 'UK', ['shell']),
  S('AZN.L', 'AstraZeneca', 'Pharma', 'UK', ['astrazeneca']),
  S('ULVR.L', 'Unilever', 'Consumer', 'UK', ['unilever']),
  S('VOD.L', 'Vodafone', 'Telecom', 'UK', ['vodafone']),
  S('SAP.DE', 'SAP', 'Technology', 'EU', ['sap']),
  S('MC.PA', 'LVMH', 'Consumer', 'EU', ['lvmh']),
  S('7203.T', 'Toyota Motor', 'Auto', 'JP', ['toyota']),
  S('0700.HK', 'Tencent', 'Technology', 'HK', ['tencent']),
  S('BHP.AX', 'BHP Group', 'Mining', 'AU', ['bhp']),
];

export const INDICES = [
  S('^NSEI', 'NIFTY 50', 'Index', 'IN', ['nifty', 'nifty 50', 'nifty50', 'indian market']),
  S('^BSESN', 'SENSEX', 'Index', 'IN', ['sensex']),
  S('^NSEBANK', 'NIFTY Bank', 'Index', 'IN', ['bank nifty', 'nifty bank']),
  S('^INDIAVIX', 'India VIX', 'Volatility', 'IN', ['india vix']),
  S('^GSPC', 'S&P 500', 'Index', 'US', ['s&p', 's&p 500', 'sp500', 'us market']),
  S('^IXIC', 'NASDAQ Composite', 'Index', 'US', ['nasdaq']),
  S('^DJI', 'Dow Jones', 'Index', 'US', ['dow', 'dow jones']),
  S('^VIX', 'CBOE VIX', 'Volatility', 'US', ['vix']),
  S('^FTSE', 'FTSE 100', 'Index', 'UK', ['ftse', 'uk market']),
  S('^GDAXI', 'DAX', 'Index', 'EU', ['dax']),
  S('^N225', 'Nikkei 225', 'Index', 'JP', ['nikkei']),
  S('^HSI', 'Hang Seng', 'Index', 'HK', ['hang seng']),
];

export const HOME_INDICES = ['^NSEI', '^BSESN', '^GSPC', '^FTSE'];
const FEATURED = [...STOCKS, ...INDICES];
const SYMBOL_RE = /^[A-Za-z0-9^=.\-&]{1,25}$/;

export const isValidSymbol = (s) => SYMBOL_RE.test(String(s || ''));
export const instrument = (symbol) => FEATURED.find((s) => s.symbol === String(symbol).toUpperCase()) || null;

export function regionOf(symbol) {
  const s = symbol.toUpperCase();
  const meta = instrument(s);
  if (meta) return meta.region;
  if (/\.(NS|BO)$/.test(s)) return 'IN';
  if (/\.L$/.test(s)) return 'UK';
  if (/\.(DE|PA|AS|MI|MC|SW|BR|ST|HE|CO|OL)$/.test(s)) return 'EU';
  if (/\.T$/.test(s)) return 'JP';
  if (/\.HK$/.test(s)) return 'HK';
  if (/\.AX$/.test(s)) return 'AU';
  if (/\.TO$/.test(s)) return 'CA';
  if (/-USD$|=X$|=F$/.test(s)) return 'GLOBAL';
  return 'US';
}

/** Volatility index used as the "fear gauge" feature for a symbol's crash-risk model. */
export const volIndexFor = (symbol) => (regionOf(symbol) === 'IN' ? '^INDIAVIX' : '^VIX');
export const benchmarkFor = (symbol) => ({ IN: '^NSEI', UK: '^FTSE', EU: '^GDAXI', JP: '^N225', HK: '^HSI' })[regionOf(symbol)] || '^GSPC';

const cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  if (hit?.pending) return hit.pending;
  const pending = fn()
    .then((value) => {
      cache.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .catch((err) => {
      cache.delete(key);
      throw err;
    });
  cache.set(key, { pending, expires: 0 });
  return pending;
}

async function yahoo(path) {
  let lastErr;
  for (const host of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
    try {
      const res = await fetch(host + path, { headers: { 'User-Agent': 'Mozilla/5.0 (FinTwin)', Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (res.status === 404) {
        const err = new Error('Symbol not found');
        err.status = 404;
        throw err;
      }
      if (!res.ok) throw new Error(`Yahoo responded ${res.status}`);
      return await res.json();
    } catch (err) {
      if (err.status === 404) throw err;
      lastErr = err;
    }
  }
  throw lastErr;
}

async function fetchChart(symbol, range, interval) {
  const json = await yahoo(`/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div,splits`);
  const result = json?.chart?.result?.[0];
  if (!result?.timestamp) {
    const err = new Error(json?.chart?.error?.description || `No price data for ${symbol}`);
    err.status = 404;
    throw err;
  }
  return result;
}

function rowsFromChart(result, intraday = false) {
  const q = result.indicators.quote[0];
  const adj = result.indicators.adjclose?.[0]?.adjclose;
  const rows = [];
  result.timestamp.forEach((ts, i) => {
    const close = q.close[i];
    if (close === null || close === undefined) return;
    const d = new Date((ts + (result.meta.gmtoffset || 0)) * 1000);
    rows.push({
      date: intraday ? new Date(ts * 1000).toISOString() : d.toISOString().slice(0, 10),
      open: q.open[i] ?? close, high: q.high[i] ?? close, low: q.low[i] ?? close, close,
      adjClose: adj?.[i] ?? close, volume: q.volume[i] ?? 0,
    });
  });
  return rows;
}

// Deterministic random walk: used ONLY when Yahoo is unreachable and always flagged source:'simulated'.
function simulatedRows(symbol, days) {
  let seed = [...symbol].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const rows = [];
  let price = 1000;
  const now = Date.now();
  for (let i = Math.ceil(days * 1.45); i >= 0; i--) {
    const d = new Date(now - i * 86400e3);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    price *= 1 + (rand() - 0.485) * 0.024;
    rows.push({ date: d.toISOString().slice(0, 10), open: price * 0.997, high: price * 1.009, low: price * 0.99, close: price, adjClose: price, volume: Math.floor(1e6 + rand() * 5e5) });
  }
  return rows.slice(-days);
}

export const RANGES = {
  '1d': ['1d', '5m'], '5d': ['5d', '30m'], '1mo': ['1mo', '1d'], '3mo': ['3mo', '1d'], '6mo': ['6mo', '1d'],
  ytd: ['ytd', '1d'], '1y': ['1y', '1d'], '2y': ['2y', '1d'], '5y': ['5y', '1d'], '10y': ['10y', '1d'], max: ['max', '1mo'],
};
const RANGE_DAYS = { '1mo': 22, '3mo': 64, '6mo': 126, '1y': 250, '2y': 500, '5y': 1250, '10y': 2500 };

export async function history(symbol, range = '1y') {
  const sym = symbol.toUpperCase();
  const [r, interval] = RANGES[range] || RANGES['1y'];
  return cached(`hist:${sym}:${range}`, ['1d', '5d'].includes(range) ? 60e3 : 30 * 60e3, async () => {
    try {
      const result = await fetchChart(sym, r, interval);
      return { symbol: sym, range, interval, source: 'yahoo', currency: result.meta.currency, name: result.meta.longName || result.meta.shortName || sym, rows: rowsFromChart(result, ['5m', '30m'].includes(interval)) };
    } catch (err) {
      if (err.status === 404) throw err;
      return { symbol: sym, range, interval, source: 'simulated', error: err.message, rows: simulatedRows(sym, RANGE_DAYS[range] || 250) };
    }
  });
}

export function marketState(region = 'IN', now = new Date()) {
  const zones = { IN: [5.5, 555, 930], US: [-4, 570, 960], UK: [1, 480, 990], EU: [2, 540, 1050], JP: [9, 540, 900], HK: [8, 570, 960], AU: [11, 600, 960], CA: [-4, 570, 960] };
  if (region === 'GLOBAL') return 'open';
  const [offset, open, close] = zones[region] || zones.US;
  const local = new Date(now.getTime() + offset * 3600e3);
  const day = local.getUTCDay();
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (day === 0 || day === 6) return 'closed';
  return minutes >= open && minutes <= close ? 'open' : 'closed';
}

export async function quote(symbol) {
  const sym = symbol.toUpperCase();
  return cached(`quote:${sym}`, 30e3, async () => {
    const meta = instrument(sym);
    try {
      const result = await fetchChart(sym, '1d', '5m');
      const m = result.meta;
      const intraday = rowsFromChart(result, true).map((r) => ({ time: r.date, price: r.close }));
      const prev = m.chartPreviousClose ?? m.previousClose;
      const price = m.regularMarketPrice;
      return {
        symbol: sym, name: meta?.name || m.longName || m.shortName || sym, sector: meta?.sector, region: regionOf(sym),
        price, previousClose: prev, change: price - prev, changePercent: prev ? ((price - prev) / prev) * 100 : 0,
        dayHigh: m.regularMarketDayHigh, dayLow: m.regularMarketDayLow, volume: m.regularMarketVolume,
        fiftyTwoWeekHigh: m.fiftyTwoWeekHigh, fiftyTwoWeekLow: m.fiftyTwoWeekLow, currency: m.currency,
        exchange: m.fullExchangeName, instrumentType: m.instrumentType,
        marketTime: new Date(m.regularMarketTime * 1000).toISOString(), marketState: marketState(regionOf(sym)), intraday, source: 'yahoo',
      };
    } catch (err) {
      if (err.status === 404) throw err;
      const rows = simulatedRows(sym, 5);
      const last = rows.at(-1).close;
      const prev = rows.at(-2).close;
      return {
        symbol: sym, name: meta?.name || sym, sector: meta?.sector, region: regionOf(sym), price: last, previousClose: prev,
        change: last - prev, changePercent: ((last - prev) / prev) * 100, currency: '',
        marketTime: new Date().toISOString(), marketState: marketState(regionOf(sym)), intraday: [], source: 'simulated', error: err.message,
      };
    }
  });
}

const strip = ({ intraday, ...q }) => ({ ...q, sparkline: intraday.filter((_, i) => i % 3 === 0).map((p) => p.price) });
export async function quotes(symbols) {
  const settled = await Promise.allSettled(symbols.map((s) => quote(s)));
  return settled.filter((r) => r.status === 'fulfilled').map((r) => strip(r.value));
}

export async function overview(region = 'IN') {
  const indices = region === 'ALL' ? INDICES.filter((i) => !/VIX/.test(i.symbol)).map((i) => i.symbol) : HOME_INDICES;
  const stocks = STOCKS.filter((s) => region === 'ALL' || s.region === region).map((s) => s.symbol);
  const [idx, stk] = await Promise.all([quotes(indices), quotes(stocks)]);
  return { region, marketState: marketState(region === 'ALL' ? 'IN' : region), indices: idx, stocks: stk };
}

export async function search(q) {
  const term = String(q || '').trim().slice(0, 60);
  if (!term) return [];
  return cached(`search:${term.toLowerCase()}`, 10 * 60e3, async () => {
    const local = FEATURED.filter((s) => s.symbol.toLowerCase().startsWith(term.toLowerCase()) || s.name.toLowerCase().includes(term.toLowerCase()) || s.aliases.includes(term.toLowerCase()))
      .map((s) => ({ symbol: s.symbol, name: s.name, exchange: s.region, type: s.sector === 'Index' ? 'INDEX' : 'EQUITY', featured: true }));
    try {
      const json = await yahoo(`/v1/finance/search?q=${encodeURIComponent(term)}&quotesCount=12&newsCount=0&enableFuzzyQuery=true`);
      const remote = (json.quotes || [])
        .filter((x) => x.symbol && ['EQUITY', 'ETF', 'INDEX', 'MUTUALFUND', 'CRYPTOCURRENCY', 'CURRENCY', 'FUTURE'].includes(x.quoteType))
        .map((x) => ({ symbol: x.symbol, name: x.longname || x.shortname || x.symbol, exchange: x.exchDisp || x.exchange, type: x.quoteType, sector: x.sector }));
      const seen = new Set();
      return [...local, ...remote].filter((x) => !seen.has(x.symbol) && seen.add(x.symbol)).slice(0, 15);
    } catch {
      return local;
    }
  });
}

function decode(s) {
  return s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
async function googleNews(query, region = 'IN') {
  const locale = { IN: 'hl=en-IN&gl=IN&ceid=IN:en', UK: 'hl=en-GB&gl=GB&ceid=GB:en' }[region] || 'hl=en-US&gl=US&ceid=US:en';
  const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:7d&${locale}`, { signal: AbortSignal.timeout(6000) });
  const xml = await res.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map(([, item]) => {
    const pick = (tag) => (item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || '';
    const title = decode(pick('title'));
    const source = decode(pick('source'));
    return { title: source && title.endsWith(` - ${source}`) ? title.slice(0, -source.length - 3) : title, link: decode(pick('link')), source, published: new Date(pick('pubDate') || Date.now()).toISOString() };
  });
}

/** Headlines for a symbol: Yahoo + Google News, merged, newest first. Refreshed every 5 minutes. */
export async function news(symbol) {
  const sym = symbol.toUpperCase();
  return cached(`news:${sym}`, 5 * 60e3, async () => {
    const meta = instrument(sym);
    const region = regionOf(sym);
    const name = meta?.name || (await quote(sym).catch(() => null))?.name || sym.replace(/\.[A-Z]+$/, '').replace('^', '');
    const [g, y] = await Promise.allSettled([
      googleNews(`${name} ${meta?.sector === 'Index' ? '' : 'stock'}`.trim(), region),
      yahoo(`/v1/finance/search?q=${encodeURIComponent(sym)}&quotesCount=0&newsCount=8`).then((j) =>
        (j.news || []).map((n) => ({ title: n.title, link: n.link, source: n.publisher, published: new Date(n.providerPublishTime * 1000).toISOString() }))),
    ]);
    const all = [...(y.value || []), ...(g.value || [])];
    const seen = new Set();
    const items = all.filter((n) => n.title && !seen.has(n.title.toLowerCase().slice(0, 60)) && seen.add(n.title.toLowerCase().slice(0, 60)))
      .sort((a, b) => b.published.localeCompare(a.published)).slice(0, 12);
    return { symbol: sym, fetchedAt: new Date().toISOString(), items };
  });
}

/** General market headlines for a region, refreshed every 5 minutes. */
export async function marketNews(region = 'IN') {
  const q = { IN: 'Sensex Nifty stock market', US: 'Wall Street stocks', UK: 'FTSE London stocks', ALL: 'global stock markets' }[region] || 'stock market';
  return cached(`mnews:${region}`, 5 * 60e3, async () => ({ region, fetchedAt: new Date().toISOString(), items: await googleNews(q, region).catch(() => []) }));
}

/** Find the instrument a chat message refers to: featured aliases first, then explicit tickers via Yahoo search. */
export async function resolveInstrument(message) {
  const text = ` ${message.toLowerCase()} `;
  for (const s of FEATURED) {
    const bare = s.symbol.toLowerCase().replace(/\.(ns|l|de|pa|t|hk|ax)$/, '').replace('^', '');
    if (bare.length >= 3 && new RegExp(`[^a-z0-9]${bare.replace(/[&.]/g, '\\$&')}[^a-z0-9]`).test(text)) return { symbol: s.symbol, name: s.name };
    if (s.aliases.some((a) => new RegExp(`[^a-z]${a.replace(/[&.]/g, '\\$&')}[^a-z]`).test(text))) return { symbol: s.symbol, name: s.name };
  }
  const tickers = [...message.matchAll(/\$?\b([A-Z]{2,6}(?:\.[A-Z]{1,2})?|\d{4}\.[A-Z]{1,2})\b/g)].map((m) => m[1]).filter((t) => !['I', 'AI', 'US', 'UK', 'EU', 'ETF', 'IPO', 'CEO', 'RAG', 'PDF', 'SIP', 'EMI', 'GDP', 'FD'].includes(t));
  for (const t of tickers.slice(0, 3)) {
    const hit = (await search(t).catch(() => []))[0];
    if (hit && hit.symbol.toUpperCase().startsWith(t.split('.')[0])) return { symbol: hit.symbol, name: hit.name };
  }
  return null;
}
