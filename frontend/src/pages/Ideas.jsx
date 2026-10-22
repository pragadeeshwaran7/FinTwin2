import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, FlaskConical, Lightbulb, ShieldAlert, TrendingUp } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ErrorState, Notice, PageHeader, Segmented, Spinner } from '../components/ui';
import { useApi } from '../lib/useApi';
import { cn, money, pct } from '../lib/format';

const REGIONS = [{ value: 'IN', label: 'India' }, { value: 'US', label: 'US' }, { value: 'UK', label: 'UK & Europe' }, { value: 'GLOBAL', label: 'Global' }];
const SIGNAL = { consider: { tone: 'success', label: 'Consider' }, hold: { tone: 'neutral', label: 'Neutral' }, avoid: { tone: 'danger', label: 'Avoid for now' } };

function FactorBar({ label, z }) {
  const v = Math.max(-2, Math.min(2, z ?? 0));
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <div className="relative h-1.5 flex-1 rounded-full bg-muted">
        <div className="absolute top-0 h-1.5 rounded-full" style={{ left: v >= 0 ? '50%' : `${50 + v * 25}%`, width: `${Math.abs(v) * 25}%`, background: v >= 0 ? 'var(--series-3)' : 'var(--series-8)' }} />
        <div className="absolute left-1/2 top-[-2px] h-2.5 w-px bg-border" />
      </div>
    </div>
  );
}

export default function Ideas() {
  const navigate = useNavigate();
  const [region, setRegion] = useState('IN');
  const [withWatch, setWithWatch] = useState(false);
  const { data, error, loading, reload } = useApi('/ml/ideas', { query: { region, watchlist: withWatch ? '1' : undefined } });
  const bt = data?.backtest?.[region === 'IN' ? 'IN' : 'GLOBAL'];
  const consider = data?.ideas.filter((i) => i.signal === 'consider') || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Stock ideas"
        subtitle="A transparent momentum screen with a trend filter and turbulence overlay, with its track record shown"
        actions={
          <>
            <Segmented size="sm" value={region} onChange={setRegion} options={REGIONS} />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={withWatch} onChange={(e) => setWithWatch(e.target.checked)} className="accent-[rgb(var(--primary))]" /> Include my watchlist
            </label>
          </>
        }
      />

      <Notice tone="warning" icon={AlertTriangle} className="mb-6">
        These are research ideas from a rules-based screen, not personalised investment advice. In India, personalised buy/sell recommendations require SEBI registration (Investment Adviser or Research Analyst). Do your own research, and consider costs, taxes and your risk tolerance.
      </Notice>

      {loading && !data ? <Spinner label="Ranking stocks and scoring turbulence risk… (first run takes ~20 s)" /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            {consider.length === 0 && (
              <Card className="flex items-start gap-3 p-4 text-sm">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span className="text-muted-foreground">No stock in this universe passes the trend filter (above its 200-day average with top-third momentum) right now. That is itself a signal: the screen stays defensive in falling markets. The ranking below is for reference.</span>
              </Card>
            )}
            {data.ideas.map((i) => (
              <Card key={i.ticker} className={cn('p-4', i.signal === 'consider' && 'border-success/40')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i.rank}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{i.ticker}</span>
                        <span className="truncate text-sm text-muted-foreground">{i.name}</span>
                        <Badge tone={SIGNAL[i.signal].tone}>{SIGNAL[i.signal].label}</Badge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.reasons.join(' · ')}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tabular text-sm font-semibold">{money(i.price, i.currency)}</div>
                    <div className={cn('tabular text-xs', i.momentum_12_1 >= 0 ? 'text-success' : 'text-danger')}>12-1m {pct(i.momentum_12_1 * 100, 0)}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-[1fr,1fr,auto] sm:items-center">
                  <FactorBar label="Momentum" z={i.factors.momentum} />
                  <FactorBar label="Trend" z={i.factors.trend} />
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    {i.turbulence != null && <Badge tone={i.turbulence >= 0.6 ? 'danger' : i.turbulence >= 0.35 ? 'warning' : 'success'}>Turbulence {Math.round(i.turbulence * 100)}%</Badge>}
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/markets?s=${encodeURIComponent(i.ticker)}`)}>Chart <ArrowRight className="h-3 w-3" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Track record" subtitle="Backtest: monthly rebalance, top third by momentum vs equal weight" action={<FlaskConical className="h-4 w-4 text-muted-foreground" />} />
              {bt && (
                <div className="space-y-3 p-5 text-sm">
                  <p className="text-xs text-muted-foreground">{bt.universe}, {bt.period}</p>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg bg-muted/60 p-3"><div className="text-xs text-muted-foreground">Screen</div><div className="tabular text-base font-semibold">{pct(bt.top_annual_return * 100)}/yr</div></div>
                    <div className="rounded-lg bg-muted/60 p-3"><div className="text-xs text-muted-foreground">Equal weight</div><div className="tabular text-base font-semibold">{pct(bt.universe_annual_return * 100)}/yr</div></div>
                    <div className="rounded-lg bg-muted/60 p-3"><div className="text-xs text-muted-foreground">Excess</div><div className={cn('tabular text-base font-semibold', bt.excess_annual > 0.02 ? 'text-success' : '')}>{pct(bt.excess_annual * 100)}/yr</div></div>
                    <div className="rounded-lg bg-muted/60 p-3"><div className="text-xs text-muted-foreground">Months beaten</div><div className="tabular text-base font-semibold">{Math.round(bt.hit_rate * 100)}%</div></div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{data.backtest.caveat}</p>
                </div>
              )}
            </Card>
            <Card className="p-5 text-sm">
              <div className="flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-primary" /> How it works</div>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
                <li><span className="font-medium text-foreground">Momentum (ranking):</span> return from 12 months ago to 1 month ago. It was the only factor with any edge in our tests; trend and low-volatility blends did worse.</li>
                <li><span className="font-medium text-foreground">Trend filter:</span> only stocks above their 200-day average can be flagged “Consider”.</li>
                <li><span className="font-medium text-foreground">Turbulence overlay:</span> scores are cut when the risk model expects a volatile month.</li>
                <li><span className="font-medium text-foreground">Universe:</span> {data.universe} ({data.ideas.length} stocks). Refreshed hourly.</li>
              </ul>
              <Button variant="outline" size="sm" className="mt-4 w-full" icon={TrendingUp} onClick={() => navigate('/portfolio', { state: { tickers: consider.slice(0, 8).map((x) => x.ticker) } })} disabled={consider.length < 2}>
                Optimise these with QAOA
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
