import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, ArrowRight, IndianRupee, Info, PieChart, PiggyBank, Repeat, Send, Sparkles, TrendingDown, TrendingUp, Upload, Wallet,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, Segmented, Skeleton, Stat } from '../components/ui';
import { axisProps, ChartTooltip, gridProps, Legend, RiskGauge, SERIES } from '../components/charts';
import { useApi } from '../lib/useApi';
import { useAuth } from '../lib/auth';
import { cn, inr, inrCompact, longDate, monthLabel, pct, shortDate } from '../lib/format';

const RANGES = [
  { value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '90d', label: '90D' },
  { value: '6m', label: '6M' }, { value: '1y', label: '1Y' }, { value: 'all', label: 'All' },
];
const INSIGHT_ICONS = { PiggyBank, TrendingUp, TrendingDown, AlertTriangle, PieChart };
const INSIGHT_TONES = { positive: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning', negative: 'bg-danger/10 text-danger', info: 'bg-primary/10 text-primary' };

function SpendingChart({ data, range }) {
  const weekly = data.length > 1 && Date.parse(data[1].date) - Date.parse(data[0].date) > 86400e3 * 3;
  return (
    <Card className="flex flex-col lg:col-span-2">
      <CardHeader title="Spending over time" subtitle={weekly ? 'Weekly totals' : 'Daily totals'} />
      <div className="h-64 flex-1 px-2 pb-4 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} minTickGap={28} />
            <YAxis {...axisProps} tickFormatter={inrCompact} width={52} />
            <Tooltip content={<ChartTooltip labelFormatter={(l) => (weekly ? `Week of ${longDate(l)}` : longDate(l))} valueFormatter={(v) => inr(v)} />} cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey="amount" name="Spent" stroke="var(--series-1)" strokeWidth={2} fill="url(#spendFill)" activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--card))' }} isAnimationActive={range !== 'all'} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function CategoryBars({ categories }) {
  const max = Math.max(...categories.map((c) => c.amount), 1);
  return (
    <Card>
      <CardHeader title="Where the money went" subtitle="Expenses by category" action={<Link to="/transactions" className="text-xs font-medium text-primary hover:underline">Details</Link>} />
      <div className="space-y-3 px-5 pb-5 pt-4">
        {categories.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No expenses in this period</p>}
        {categories.map((c) => (
          <div key={c.category} title={`${c.category}: ${inr(c.amount)} across ${c.count} transactions`}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-medium text-foreground">{c.category}{c.merged ? ` (${c.merged})` : ''}</span>
              <span className="tabular shrink-0 text-muted-foreground">
                <span className="font-medium text-foreground">{inr(c.amount)}</span> · {c.percentage}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (c.amount / max) * 100)}%`, background: 'var(--series-1)' }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MonthlyChart({ trends }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Income vs expenses" subtitle="Last 12 months (transfers & investments excluded)" action={<Legend items={[{ label: 'Income', color: SERIES[0] }, { label: 'Expenses', color: SERIES[1] }]} />} />
      <div className="h-64 px-2 pb-4 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trends} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} tickFormatter={monthLabel} />
            <YAxis {...axisProps} tickFormatter={inrCompact} width={52} />
            <Tooltip content={<ChartTooltip labelFormatter={monthLabel} valueFormatter={(v) => inr(v)} />} cursor={{ fill: 'rgb(var(--muted) / 0.6)' }} />
            <Bar dataKey="income" name="Income" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="expenses" name="Expenses" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function MarketPulse() {
  const quote = useApi('/markets/quote/^NSEI');
  const risk = useApi('/ml/crash-risk', { query: { ticker: '^NSEI' } });
  const q = quote.data;
  const r = risk.data;
  const tone = r?.level === 'high' ? 'danger' : r?.level === 'elevated' ? 'warning' : 'success';
  return (
    <Card>
      <CardHeader title="Market pulse" subtitle="NIFTY 50 & turbulence model" action={<Link to="/markets" className="text-xs font-medium text-primary hover:underline">Markets</Link>} />
      <div className="px-5 pb-5 pt-3">
        {q ? (
          <div className="flex items-baseline justify-between">
            <div className="text-xl font-semibold tabular">{q.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <span className={cn('text-sm font-medium', q.change >= 0 ? 'text-success' : 'text-danger')}>{pct(q.changePercent, 2)}</span>
          </div>
        ) : (
          <Skeleton className="h-7 w-40" />
        )}
        <div className="mt-4 flex flex-col items-center">
          {risk.loading ? (
            <Skeleton className="h-24 w-44" />
          ) : risk.error ? (
            <p className="py-4 text-center text-xs text-muted-foreground">{risk.error.message}</p>
          ) : (
            <>
              <RiskGauge value={r.risk_index} size={170} />
              <Badge tone={tone} className="mt-1 capitalize">
                <AlertTriangle className="h-3 w-3" /> {r.level} turbulence risk
              </Badge>
              <p className="mt-2 text-center text-xs text-muted-foreground">{r.suggested_action}</p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function QuickAsk() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const suggestions = ['Where did most of my money go?', 'How can I save ₹5,000 more a month?', 'What stocks should I consider?'];
  const go = (text) => text.trim() && navigate('/assistant', { state: { q: text.trim() } });
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" /> Ask your twin
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
      >
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about spending, savings or stocks…" />
        <Button type="submit" size="icon" aria-label="Ask">
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button key={s} onClick={() => go(s)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary">
            {s}
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState('30d');
  const { data, error, loading, reload } = useApi('/transactions/dashboard', { query: { range } });
  const meta = useApi('/transactions/meta', { select: (d) => d });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const empty = meta.data?.count === 0;
  const m = data?.metrics;
  const c = data?.changes;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`${greeting}, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle={data ? `${longDate(data.range.from > '1900' ? data.range.from : data.spending[0]?.date || data.range.to)} to ${longDate(data.range.to)}` : 'Your financial overview'}
        actions={
          <>
            <Segmented value={range} onChange={setRange} options={RANGES} />
            <Link to="/upload" className="hidden sm:block">
              <Button variant="outline" icon={Upload}>Upload</Button>
            </Link>
          </>
        }
      />

      {empty ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="Your twin needs data"
            description="Upload a bank statement CSV or load the sample Indian household dataset to see your dashboard."
            action={<Link to="/upload"><Button icon={Upload}>Add transactions</Button></Link>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Income" icon={IndianRupee} loading={loading && !m} value={inr(m?.totalIncome)} delta={c?.totalIncome} />
            <Stat label="Expenses" icon={Wallet} loading={loading && !m} value={inr(m?.totalExpenses)} delta={c?.totalExpenses} goodWhen="down" />
            <Stat label="Net savings" icon={PiggyBank} loading={loading && !m} value={inr(m?.netIncome)} delta={c?.netIncome} />
            <Stat label="Savings rate" icon={TrendingUp} loading={loading && !m} value={m?.savingsRate == null ? '—' : `${m.savingsRate}%`} delta={c?.savingsRate} hint="pts" />
          </div>

          {data && data.metrics.transactionCount === 0 && (
            <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Info className="h-4 w-4" /> No transactions in this range. Try a longer period.
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {data ? <SpendingChart data={data.spending} range={range} /> : <Skeleton className="h-80 lg:col-span-2" />}
            {data ? <CategoryBars categories={data.categories} /> : <Skeleton className="h-80" />}
          </div>

          {data?.insights?.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.insights.map((ins) => {
                const Icon = INSIGHT_ICONS[ins.icon] || Info;
                return (
                  <Card key={ins.title} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('rounded-lg p-2', INSIGHT_TONES[ins.kind])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{ins.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ins.detail}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {data ? <MonthlyChart trends={data.trends} /> : <Skeleton className="h-80 lg:col-span-2" />}
            <MarketPulse />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Recent transactions" action={<Link to="/transactions" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>} />
              <ul className="divide-y divide-border px-5 pb-2 pt-2">
                {(data?.recentTransactions || []).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {shortDate(t.date)} · {t.category}
                        {t.subcategory ? ` / ${t.subcategory}` : ''} · {t.account}
                      </p>
                    </div>
                    <span className={cn('tabular shrink-0 text-sm font-semibold', t.type === 'income' ? 'text-success' : t.type === 'transfer' ? 'text-muted-foreground' : 'text-foreground')}>
                      {t.type === 'income' ? '+' : '−'}
                      {inr(Math.abs(t.amount))}
                    </span>
                  </li>
                ))}
                {data && !data.recentTransactions.length && <li className="py-6 text-center text-sm text-muted-foreground">Nothing here yet</li>}
              </ul>
            </Card>
            <div className="space-y-6">
              <QuickAsk />
              <Card>
                <CardHeader title="Recurring payments" subtitle="Seen in 3+ different months" />
                <ul className="space-y-2.5 px-5 pb-5 pt-3">
                  {(data?.recurring || []).slice(0, 5).map((r) => (
                    <li key={r.description} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{r.description}</span>
                      </span>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">~{inr(r.averageAmount)} · {r.months} mo</span>
                    </li>
                  ))}
                  {data && !data.recurring.length && <li className="text-sm text-muted-foreground">None detected yet</li>}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
