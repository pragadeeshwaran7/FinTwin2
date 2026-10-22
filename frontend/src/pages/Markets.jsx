import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertTriangle, ExternalLink, Newspaper, RefreshCw, ShieldAlert, Sparkles, Star } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ErrorState, Notice, PageHeader, Segmented, Skeleton, Spinner } from '../components/ui';
import { axisProps, ChartTooltip, gridProps, Legend, RiskGauge, Sparkline, STATUS } from '../components/charts';
import SymbolSearch from '../components/SymbolSearch';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { ago, cn, longDate, money, pct, shortDate, timeLabel } from '../lib/format';

const RANGES = [
  { value: '1d', label: '1D' }, { value: '5d', label: '5D' }, { value: '1mo', label: '1M' }, { value: '6mo', label: '6M' },
  { value: 'ytd', label: 'YTD' }, { value: '1y', label: '1Y' }, { value: '5y', label: '5Y' }, { value: 'max', label: 'Max' },
];
const REGIONS = [{ value: 'IN', label: 'India' }, { value: 'US', label: 'US' }, { value: 'UK', label: 'UK' }, { value: 'ALL', label: 'Global' }];
const NEWS_REFRESH_MS = 5 * 60e3;

function useWatchlist() {
  const wl = useApi('/markets/watchlist');
  const symbols = wl.data?.symbols || [];
  const save = async (next) => {
    await api('/markets/watchlist', { method: 'PUT', body: { symbols: next } });
    wl.reload();
  };
  return { ...wl, symbols, toggle: (s) => save(symbols.includes(s) ? symbols.filter((x) => x !== s) : [...symbols, s]) };
}

function QuoteRow({ q, active, onClick }) {
  const up = q.change >= 0;
  return (
    <button onClick={onClick} className={cn('flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left transition hover:bg-muted/50', active && 'bg-primary/5')}>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{q.symbol.replace('^', '')}</div>
        <div className="truncate text-xs text-muted-foreground">{q.name}</div>
      </div>
      <Sparkline data={q.sparkline} positive={up} width={60} height={24} />
      <div className="w-28 text-right">
        <div className="tabular text-sm font-medium">{money(q.price, q.currency)}</div>
        <div className={cn('tabular text-xs font-medium', up ? 'text-success' : 'text-danger')}>{pct(q.changePercent, 2)}</div>
      </div>
    </button>
  );
}

function PriceChart({ symbol, quote, watched, onToggleWatch }) {
  const [range, setRange] = useState('1y');
  const [showRange, setShowRange] = useState(false);
  const hist = useApi(`/markets/history/${encodeURIComponent(symbol)}`, { query: { range } });
  const outlook = useApi(`/ml/forecast/${encodeURIComponent(symbol)}`, { query: { horizon: 20 }, enabled: showRange && !/VIX/.test(symbol) });
  const cur = quote?.currency || hist.data?.currency;
  const intraday = ['1d', '5d'].includes(range);

  const data = useMemo(() => {
    if (!hist.data) return [];
    const rows = hist.data.rows.map((r) => ({ date: r.date, close: r.close }));
    if (showRange && outlook.data && !intraday) {
      const last = rows.at(-1);
      if (last) Object.assign(last, { band95: [last.close, last.close], band80: [last.close, last.close] });
      outlook.data.forecast.forEach((f) => rows.push({ date: f.date, band95: [f.lower, f.upper], band80: [f.lower80, f.upper80] }));
    }
    return rows;
  }, [hist.data, outlook.data, showRange, intraday]);

  const first = hist.data?.rows[0]?.close;
  const last = hist.data?.rows.at(-1)?.close;
  const change = first ? ((last - first) / first) * 100 : null;
  const fmtX = (v) => (intraday ? (range === '1d' ? timeLabel(v) : shortDate(v)) : shortDate(v));

  return (
    <Card>
      <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{quote?.name || hist.data?.name || symbol}</h2>
            <Badge>{symbol}</Badge>
            {quote?.exchange && <Badge tone="primary">{quote.exchange}</Badge>}
            <button onClick={onToggleWatch} className="rounded p-1 text-muted-foreground hover:text-warning" aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'} title={watched ? 'Remove from watchlist' : 'Add to watchlist'}>
              <Star className={cn('h-4 w-4', watched && 'fill-warning text-warning')} />
            </button>
          </div>
          {quote ? (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <span className="tabular text-3xl font-semibold">{money(quote.price, cur)}</span>
              <span className={cn('tabular text-sm font-medium', quote.change >= 0 ? 'text-success' : 'text-danger')}>
                {quote.change >= 0 ? '+' : ''}{money(quote.change, cur)} ({pct(quote.changePercent, 2)}) today
              </span>
            </div>
          ) : <Skeleton className="mt-2 h-9 w-48" />}
          {quote && (
            <p className="mt-1 text-xs text-muted-foreground">
              Day {money(quote.dayLow, cur)} to {money(quote.dayHigh, cur)} · 52w {money(quote.fiftyTwoWeekLow, cur)} to {money(quote.fiftyTwoWeekHigh, cur)} · {quote.marketState === 'open' ? 'market open' : 'market closed'} · {timeLabel(quote.marketTime)}
              {quote.source === 'simulated' && <span className="ml-1 font-medium text-warning">(simulated: live feed unavailable)</span>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!/VIX/.test(symbol) && !intraday && (
            <Button variant={showRange ? 'subtle' : 'outline'} size="sm" icon={Sparkles} onClick={() => setShowRange((s) => !s)} loading={showRange && outlook.loading}>
              20-day range
            </Button>
          )}
          <Segmented size="sm" value={range} onChange={setRange} options={RANGES} />
        </div>
      </div>
      <div className="flex items-center justify-between px-5 pt-3 text-xs text-muted-foreground">
        {change !== null ? <span>{RANGES.find((r) => r.value === range).label} change: <span className={cn('font-medium', change >= 0 ? 'text-success' : 'text-danger')}>{pct(change)}</span></span> : <span />}
        {showRange && outlook.data && !intraday && <Legend items={[{ label: 'Price', color: 'var(--series-1)', line: true }, { label: '80% range', color: 'color-mix(in srgb, var(--series-2) 45%, transparent)' }, { label: '95% range', color: 'color-mix(in srgb, var(--series-2) 18%, transparent)' }]} />}
      </div>
      <div className="h-72 px-2 pb-3 pt-2">
        {hist.loading && !hist.data ? <Spinner /> : hist.error ? <ErrorState error={hist.error} onRetry={hist.reload} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="date" {...axisProps} tickFormatter={fmtX} minTickGap={40} />
              <YAxis {...axisProps} domain={['auto', 'auto']} tickFormatter={(v) => (v >= 1e5 ? `${(v / 1e3).toFixed(0)}K` : v >= 100 ? v.toFixed(0) : v.toFixed(2))} width={52} />
              <Tooltip content={<ChartTooltip labelFormatter={(l) => (intraday ? new Date(l).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : longDate(l))} valueFormatter={(v) => (Array.isArray(v) ? `${money(v[0], cur)} to ${money(v[1], cur)}` : money(v, cur))} />} cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }} />
              {showRange && outlook.data && <Area dataKey="band95" name="95% range" stroke="none" fill="var(--series-2)" fillOpacity={0.12} isAnimationActive={false} />}
              {showRange && outlook.data && <Area dataKey="band80" name="80% range" stroke="none" fill="var(--series-2)" fillOpacity={0.28} isAnimationActive={false} />}
              <Line type="monotone" dataKey="close" name="Price" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      {showRange && outlook.error && <Notice tone="warning" className="mx-5 mb-4">{outlook.error.message}</Notice>}
      {showRange && outlook.data && !intraday && (
        <div className="mx-5 mb-5 grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-xs sm:grid-cols-4">
          <div><div className="text-muted-foreground">80% likely in 20 sessions</div><div className="tabular mt-0.5 text-sm font-semibold">{money(outlook.data.range80[0], cur)} to {money(outlook.data.range80[1], cur)}</div></div>
          <div><div className="text-muted-foreground">Typical move (80%)</div><div className="tabular mt-0.5 text-sm font-semibold">±{(outlook.data.move80_pct * 100).toFixed(1)}%</div></div>
          <div><div className="text-muted-foreground">Band accuracy on this stock</div><div className="tabular mt-0.5 text-sm font-semibold">{outlook.data.calibration ? `${(outlook.data.calibration.cover80 * 100).toFixed(0)}% inside 80% band` : 'n/a'}</div></div>
          <div><div className="text-muted-foreground">Annual volatility</div><div className="tabular mt-0.5 text-sm font-semibold">{(outlook.data.annual_volatility * 100).toFixed(0)}%</div></div>
          <p className="col-span-2 text-muted-foreground sm:col-span-4">A range, not a prediction of direction: in our walk-forward tests on 41 global stocks, no model called up/down better than chance (51.6% vs 51.7%). Bands use EWMA volatility; check how often this stock stayed inside them over the last 3 years.</p>
        </div>
      )}
    </Card>
  );
}

function RiskPanel({ symbol, currency }) {
  const risk = useApi('/ml/crash-risk', { query: { ticker: symbol }, enabled: !/VIX/.test(symbol) });
  if (/VIX/.test(symbol)) return null;
  const r = risk.data;
  const tone = r?.level === 'high' ? 'danger' : r?.level === 'elevated' ? 'warning' : 'success';
  return (
    <Card>
      <CardHeader title="Turbulence risk (fixit crash-aware v2)" subtitle="Probability the next 20 sessions are unusually volatile for this asset" action={r && <Badge tone={tone} className="capitalize"><ShieldAlert className="h-3 w-3" /> {r.level}</Badge>} />
      {risk.loading ? <Spinner label="Scoring with the global turbulence model…" /> : risk.error ? <ErrorState error={risk.error} onRetry={risk.reload} /> : (
        <div className="grid gap-6 p-5 lg:grid-cols-5">
          <div className="flex flex-col items-center lg:col-span-2">
            <RiskGauge value={r.risk_index} />
            <div className="mt-3 grid w-full grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/60 p-2"><div className="text-muted-foreground">Volatility now</div><div className="tabular mt-0.5 text-sm font-semibold">{(r.current_volatility * 100).toFixed(0)}%</div></div>
              <div className="rounded-lg bg-muted/60 p-2"><div className="text-muted-foreground">Its normal</div><div className="tabular mt-0.5 text-sm font-semibold">{(r.normal_volatility * 100).toFixed(0)}%</div></div>
            </div>
            <Notice tone={tone === 'success' ? 'success' : tone} icon={AlertTriangle} className="mt-3 w-full">{r.suggested_action}</Notice>
          </div>
          <div className="lg:col-span-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">What is driving the score</p>
            <div className="space-y-2.5">
              {r.drivers.map((d) => (
                <div key={d.feature}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{d.label}</span><span className="tabular text-muted-foreground">{d.zscore >= 0 ? '+' : ''}{d.zscore.toFixed(1)}σ vs its history</span></div>
                  <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full" style={{ width: `${Math.max(3, d.impact * 100)}%`, background: 'var(--series-7)' }} /></div>
                </div>
              ))}
            </div>
            <p className="mb-1 mt-5 text-xs font-medium text-muted-foreground">Turbulence probability, last {r.timeline.length} sessions</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={r.timeline} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} minTickGap={36} />
                  <YAxis {...axisProps} domain={[0, 1]} ticks={[0, 0.35, 0.6, 1]} tickFormatter={(v) => Math.round(v * 100)} />
                  <ReferenceLine y={0.6} stroke={STATUS.critical} strokeDasharray="4 4" />
                  <ReferenceLine y={0.35} stroke={STATUS.serious} strokeDasharray="4 4" />
                  <Tooltip content={<ChartTooltip labelFormatter={longDate} valueFormatter={(v) => `${Math.round(v * 100)}%`} />} />
                  <Line type="monotone" dataKey="risk" name="Turbulence probability" stroke="var(--series-7)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Model trained on {r.metrics.assets} global assets ({r.metrics.train_rows.toLocaleString('en-IN')} days), retrained weekly (last {r.trained_at}). Out-of-sample AUC: indices {r.metrics.auc_indices.toFixed(2)}, stocks {r.metrics.auc_stocks.toFixed(2)} (naive baseline {r.metrics.naive_auc_all.toFixed(2)}). Base rate {Math.round(r.metrics.base_rate * 100)}%.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function NewsPanel({ path, query, title, subtitle }) {
  const news = useApi(path, { query });
  const [, tick] = useState(0);
  useEffect(() => {
    const refresh = setInterval(news.reload, NEWS_REFRESH_MS);
    const clock = setInterval(() => tick((t) => t + 1), 30e3);
    return () => {
      clearInterval(refresh);
      clearInterval(clock);
    };
  }, [news.reload]);
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={news.data ? `${subtitle} · updated ${ago(news.data.fetchedAt)} · auto-refresh every 5 min` : subtitle}
        action={<button onClick={news.reload} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Refresh news"><RefreshCw className={cn('h-4 w-4', news.loading && 'animate-spin')} /></button>}
      />
      <ul className="divide-y divide-border px-5 pb-3 pt-2">
        {news.loading && !news.data && <Spinner />}
        {news.data?.items.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No recent headlines</li>}
        {news.data?.items.slice(0, 8).map((n) => (
          <li key={n.link} className="py-3">
            <a href={n.link} target="_blank" rel="noreferrer noopener" className="group flex gap-2">
              <span className="text-sm font-medium leading-snug group-hover:text-primary">{n.title}</span>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
            <p className="mt-1 text-xs text-muted-foreground">{n.source} · {ago(n.published)}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Markets() {
  const [params, setParams] = useSearchParams();
  const symbol = (params.get('s') || '^NSEI').toUpperCase();
  const setSymbol = useCallback((s) => setParams({ s }), [setParams]);
  const [region, setRegion] = useState('IN');
  const [listTab, setListTab] = useState('market');
  const overview = useApi('/markets/overview', { query: { region } });
  const watch = useWatchlist();
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => api(`/markets/quote/${encodeURIComponent(symbol)}`).then((d) => !cancelled && (setQuote(d.data), setQuoteError(null))).catch((e) => !cancelled && setQuoteError(e));
    setQuote(null);
    load();
    const timer = setInterval(load, 30e3);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [symbol]);

  useEffect(() => {
    const timer = setInterval(() => {
      overview.reload();
      watch.reload();
    }, 60e3);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview.reload, watch.reload]);

  const o = overview.data;
  const list = listTab === 'watch' ? watch.data?.quotes || [] : o?.stocks || [];
  const newsRegion = { IN: 'IN', US: 'US', UK: 'UK', ALL: 'ALL' }[region];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Markets"
        subtitle="Any stock, index, ETF or crypto worldwide, with turbulence risk and range outlooks"
        actions={
          <>
            <Segmented size="sm" value={region} onChange={setRegion} options={REGIONS} />
            {o && <Badge tone={o.marketState === 'open' ? 'success' : 'neutral'} className="capitalize"><Activity className="h-3 w-3" /> {o.marketState}</Badge>}
          </>
        }
      />
      <SymbolSearch className="mb-6" onSelect={(r) => setSymbol(r.symbol)} />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {o ? o.indices.map((q) => (
          <button key={q.symbol} onClick={() => setSymbol(q.symbol)} className={cn('card flex items-center justify-between gap-2 p-4 text-left transition hover:border-primary/50', symbol === q.symbol && 'border-primary ring-2 ring-primary/20')}>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-muted-foreground">{q.name}</div>
              <div className="tabular mt-1 text-base font-semibold sm:text-lg">{q.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              <div className={cn('tabular text-xs font-medium', q.change >= 0 ? 'text-success' : 'text-danger')}>{pct(q.changePercent, 2)}</div>
            </div>
            <span className="hidden sm:block"><Sparkline data={q.sparkline} positive={q.change >= 0} /></span>
          </button>
        )) : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      </div>

      {quoteError && <Notice tone="danger" className="mb-4">Could not load {symbol}: {quoteError.message}</Notice>}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <PriceChart key={symbol} symbol={symbol} quote={quote} watched={watch.symbols.includes(symbol)} onToggleWatch={() => watch.toggle(symbol)} />
          <RiskPanel key={`risk-${symbol}`} symbol={symbol} currency={quote?.currency} />
          <NewsPanel key={`news-${symbol}`} path={`/markets/news/${encodeURIComponent(symbol)}`} title={`News: ${quote?.name || symbol}`} subtitle="Yahoo Finance + Google News" />
        </div>
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between px-5 pt-5">
              <Segmented size="sm" value={listTab} onChange={setListTab} options={[{ value: 'market', label: REGIONS.find((r) => r.value === region).label }, { value: 'watch', label: `Watchlist (${watch.symbols.length})` }]} />
            </div>
            <div className="pb-2 pt-3">
              {listTab === 'market' && !o && Array.from({ length: 8 }, (_, i) => <div key={i} className="px-5 py-2"><Skeleton className="h-9" /></div>)}
              {listTab === 'watch' && watch.data && !list.length && <p className="px-5 py-6 text-center text-sm text-muted-foreground">Star any symbol to add it here.</p>}
              {list.map((q) => <QuoteRow key={q.symbol} q={q} active={symbol === q.symbol} onClick={() => setSymbol(q.symbol)} />)}
            </div>
          </Card>
          <NewsPanel key={`mnews-${newsRegion}`} path="/markets/market-news" query={{ region: newsRegion }} title="Market headlines" subtitle={`${REGIONS.find((r) => r.value === region).label} markets`} />
        </div>
      </div>
    </div>
  );
}
