import { useEffect, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Fingerprint, Play, Plus, Target, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, Field, Input, Notice, PageHeader, Segmented, Spinner, Stat } from '../components/ui';
import { axisProps, ChartTooltip, gridProps, Legend } from '../components/charts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cn, inr, inrCompact } from '../lib/format';

const PROFILES = [{ value: 'conservative', label: 'Conservative' }, { value: 'balanced', label: 'Balanced' }, { value: 'aggressive', label: 'Aggressive' }];

export default function Twin() {
  const { user, updateProfile } = useAuth();
  const [base, setBase] = useState(null);
  const [inp, setInp] = useState(null);
  const [goals, setGoals] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/twin/baseline').then(({ data }) => {
      setBase(data);
      const b = data.behaviour;
      setInp({ startingWealth: data.holdingsValue || 500000, income: b.income || 80000, expenses: b.expenses || 50000, incomeVol: b.incomeVol || 0, expenseVol: b.expenseVol || 0, years: 15, profile: user.profile?.riskProfile || 'balanced', incomeGrowth: 0.07, inflation: 0.05 });
      setGoals(data.goals?.length ? data.goals : [{ name: 'Emergency fund', amount: 600000, year: 2 }, { name: 'Home down payment', amount: 2500000, year: 7 }, { name: 'Retirement corpus', amount: 30000000, year: 15 }]);
    }).catch((e) => setError(e.message));
    // Load once; later profile saves must not reset the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      setResult((await api('/twin/simulate', { method: 'POST', body: { ...inp, goals } })).data);
      updateProfile({ profile: { goals, riskProfile: inp.profile } }).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (inp && !result) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inp]);

  if (!inp) return error ? <Notice tone="danger">{error}</Notice> : <Spinner label="Learning your money habits…" />;
  const set = (k, num = true) => (e) => setInp({ ...inp, [k]: num ? Number(e.target.value) : e.target.value });
  const b = base.behaviour;
  const chart = result?.timeline.map((t) => ({ year: t.year, band90: [t.p10, t.p90], band50: [t.p25, t.p75], median: t.p50, real: t.real_p50 }));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Your twin" subtitle="A Monte Carlo clone of your finances: learned from your transactions, projected across thousands of possible futures" />
      <Notice tone="primary" icon={Fingerprint} className="mb-6">
        Learned from your last {b.months} months: income {inr(b.income)} (±{inr(b.incomeVol)}), spending {inr(b.expenses)} (±{inr(b.expenseVol)}), investing about {inr(b.invested)} a month. Adjust anything below to explore what-ifs.
      </Notice>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="self-start space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting net worth (₹)" className="col-span-2"><Input type="number" value={inp.startingWealth} onChange={set('startingWealth')} /></Field>
            <Field label="Monthly income (₹)"><Input type="number" value={inp.income} onChange={set('income')} /></Field>
            <Field label="Monthly spending (₹)"><Input type="number" value={inp.expenses} onChange={set('expenses')} /></Field>
            <Field label="Income growth / yr"><Input type="number" step="0.01" value={inp.incomeGrowth} onChange={set('incomeGrowth')} /></Field>
            <Field label="Inflation / yr"><Input type="number" step="0.01" value={inp.inflation} onChange={set('inflation')} /></Field>
            <Field label={`Horizon: ${inp.years} years`} className="col-span-2"><input type="range" min={1} max={40} value={inp.years} onChange={set('years')} className="w-full accent-[rgb(var(--primary))]" /></Field>
          </div>
          <Field label="Investment style"><Segmented value={inp.profile} onChange={(v) => setInp({ ...inp, profile: v })} options={PROFILES} /></Field>
          <div>
            <p className="label">Goals: name, amount in today's ₹, years from now</p>
            <div className="space-y-2">
              {goals.map((g, i) => (
                <div key={i} className="grid grid-cols-[1fr,4.5rem,auto] gap-2 rounded-lg border border-border p-2">
                  <Input className="col-span-3" value={g.name} onChange={(e) => setGoals(goals.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <Input type="number" title="Amount in today's rupees" value={g.amount} onChange={(e) => setGoals(goals.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)))} />
                  <Input type="number" min={1} max={40} value={g.year} title="Years from now" onChange={(e) => setGoals(goals.map((x, j) => (j === i ? { ...x, year: Number(e.target.value) } : x)))} />
                  <button onClick={() => setGoals(goals.filter((_, j) => j !== i))} className="rounded p-2 text-muted-foreground hover:text-danger" aria-label="Remove goal"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {goals.length < 6 && <Button size="sm" variant="ghost" icon={Plus} onClick={() => setGoals([...goals, { name: 'New goal', amount: 1000000, year: 5 }])}>Add goal</Button>}
            </div>
          </div>
          <Button className="w-full" icon={Play} onClick={run} loading={busy}>Simulate 2,000 futures</Button>
          {error && <Notice tone="danger">{error}</Notice>}
        </Card>

        <div className="space-y-6 xl:col-span-2">
          {result && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label={`Median net worth in ${result.years}y`} value={inrCompact(result.final.p50)} hint={`${inrCompact(result.final.real_p50)} in today's money`} />
                <Stat label="Pessimistic (10th pct)" value={inrCompact(result.final.p10)} hint="1 in 10 futures are worse" />
                <Stat label="Optimistic (90th pct)" value={inrCompact(result.final.p90)} hint="1 in 10 futures are better" />
                <Stat label="Risk of running short" value={`${Math.round(result.probabilityOfShortfall * 100)}%`} hint="net worth below zero at any point" />
              </div>
              <Card>
                <CardHeader title="Net worth over time" subtitle={`${result.paths.toLocaleString('en-IN')} simulated futures · ${result.assumptions.profile}: ${(result.assumptions.annualReturn * 100).toFixed(1)}% return, ${(result.assumptions.annualVol * 100).toFixed(0)}% volatility`} action={<Legend items={[{ label: 'Median', color: 'var(--series-1)', line: true }, { label: "Median (today's ₹)", color: 'var(--series-3)', dashed: true }, { label: '50% / 80% of futures', color: 'color-mix(in srgb, var(--series-1) 30%, transparent)' }]} />} />
                <div className="h-80 px-2 pb-4 pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chart} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="year" {...axisProps} tickFormatter={(y) => `Y${y}`} />
                      <YAxis {...axisProps} tickFormatter={inrCompact} width={56} />
                      <Tooltip content={<ChartTooltip labelFormatter={(y) => `Year ${y}`} valueFormatter={(v) => (Array.isArray(v) ? `${inrCompact(v[0])} to ${inrCompact(v[1])}` : inrCompact(v))} />} />
                      <Area dataKey="band90" name="80% of futures" stroke="none" fill="var(--series-1)" fillOpacity={0.12} isAnimationActive={false} />
                      <Area dataKey="band50" name="50% of futures" stroke="none" fill="var(--series-1)" fillOpacity={0.25} isAnimationActive={false} />
                      <Line dataKey="median" name="Median" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line dataKey="real" name="Median (today's ₹)" stroke="var(--series-3)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card>
                <CardHeader title="Goal check" subtitle="Share of simulated futures where you have the inflation-adjusted amount by the target year" action={<Target className="h-4 w-4 text-muted-foreground" />} />
                <ul className="space-y-3 p-5">
                  {result.goals.map((g) => (
                    <li key={g.name}>
                      <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{g.name} <span className="text-xs text-muted-foreground">· {inrCompact(g.inflatedAmount)} by year {g.year}</span></span><span className={cn('tabular font-semibold', g.probability >= 0.75 ? 'text-success' : g.probability >= 0.4 ? 'text-warning' : 'text-danger')}>{Math.round(g.probability * 100)}%</span></div>
                      <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full" style={{ width: `${g.probability * 100}%`, background: g.probability >= 0.75 ? 'var(--status-good)' : g.probability >= 0.4 ? 'var(--status-warning)' : 'var(--status-critical)' }} /></div>
                    </li>
                  ))}
                  {!result.goals.length && <li className="text-sm text-muted-foreground">Add a goal to see your odds.</li>}
                </ul>
              </Card>
              <Notice>Projections are illustrations, not guarantees. Returns are drawn from a lognormal distribution with the chosen style's long-run assumptions.</Notice>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
