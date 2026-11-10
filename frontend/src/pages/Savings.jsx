import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calculator, Info, PiggyBank, Save, Sparkles, Users } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, Field, Input, Notice, PageHeader, Select, Spinner, Stat } from '../components/ui';
import { axisProps, ChartTooltip, gridProps, Legend, SERIES } from '../components/charts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cn, inr, inrCompact, longDate } from '../lib/format';

const FIXED = [['Rent', 'Rent / EMI on home'], ['Loan_Repayment', 'Loan repayments'], ['Insurance', 'Insurance']];
const VARIABLE = [
  ['Groceries', 'Groceries'], ['Transport', 'Transport'], ['Eating_Out', 'Eating out'], ['Entertainment', 'Entertainment'],
  ['Utilities', 'Utilities & household'], ['Healthcare', 'Healthcare'], ['Education', 'Education'], ['Miscellaneous', 'Miscellaneous'],
];
const OCCUPATIONS = [{ value: 'Professional', label: 'Salaried' }, { value: 'Self_Employed', label: 'Self-employed' }, { value: 'Student', label: 'Student' }, { value: 'Retired', label: 'Retired' }];
const TIERS = [{ value: 'Tier_1', label: 'Tier 1 (metro)' }, { value: 'Tier_2', label: 'Tier 2' }, { value: 'Tier_3', label: 'Tier 3' }];

export default function Savings() {
  const { updateProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [derived, setDerived] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api('/ml/savings/profile')
      .then(({ data }) => {
        setDerived({ from: data.from, to: data.to, months: data.months });
        setProfile({
          income: data.income || 50000, age: data.age || 30, dependents: data.dependents ?? 0,
          occupation: data.occupation || 'Professional', city_tier: data.city_tier || 'Tier_1', expenses: data.expenses,
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  const set = (k) => (e) => setProfile({ ...profile, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  const setExp = (k) => (e) => setProfile({ ...profile, expenses: { ...profile.expenses, [k]: Number(e.target.value) } });

  const run = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      setResult((await api('/ml/savings', { method: 'POST', body: { profile } })).data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    const { age, dependents, occupation, city_tier } = profile;
    await updateProfile({ profile: { age, dependents, occupation, city_tier } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!profile) return error ? <Notice tone="danger">{error}</Notice> : <Spinner />;

  const chartData = result?.categories.filter((c) => !c.fixed).map((c) => ({ name: c.category, You: c.spend, Peers: Math.round(c.peer_spend) }));
  const totalSpend = Object.values(profile.expenses).reduce((s, v) => s + (Number(v) || 0), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Savings twin" subtitle="Compare your monthly budget with similar Indian households and find realistic savings" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5">
          <form onSubmit={run} className="space-y-5">
            {derived && (
              <Notice tone="primary" icon={Sparkles}>
                Pre-filled with your average monthly figures from {longDate(derived.from)} to {longDate(derived.to)}. Adjust anything that looks off.
              </Notice>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly income (₹)" className="col-span-2">
                <Input type="number" min={0} value={profile.income} onChange={set('income')} />
              </Field>
              <Field label="Age">
                <Input type="number" min={16} max={100} value={profile.age} onChange={set('age')} />
              </Field>
              <Field label="Dependents">
                <Input type="number" min={0} max={10} value={profile.dependents} onChange={set('dependents')} />
              </Field>
              <Field label="Occupation">
                <Select value={profile.occupation} onChange={set('occupation')} options={OCCUPATIONS} />
              </Field>
              <Field label="City">
                <Select value={profile.city_tier} onChange={set('city_tier')} options={TIERS} />
              </Field>
            </div>
            <div>
              <p className="label">Fixed monthly costs (₹)</p>
              <div className="grid grid-cols-2 gap-3">
                {FIXED.map(([k, l]) => (
                  <Field key={k} label={l} className={k === 'Rent' ? 'col-span-2' : ''}>
                    <Input type="number" min={0} value={profile.expenses[k]} onChange={setExp(k)} />
                  </Field>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Variable monthly spending (₹)</p>
              <div className="grid grid-cols-2 gap-3">
                {VARIABLE.map(([k, l]) => (
                  <Field key={k} label={l}>
                    <Input type="number" min={0} value={profile.expenses[k]} onChange={setExp(k)} />
                  </Field>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Total {inr(totalSpend)} of {inr(profile.income)} income
              </p>
            </div>
            {error && <Notice tone="danger">{error}</Notice>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" icon={Calculator} loading={busy}>Analyse my budget</Button>
              <Button type="button" variant="outline" icon={Save} onClick={saveProfile} title="Save age, dependents, occupation and city">
                {saved ? 'Saved' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          {!result ? (
            <Card>
              <EmptyState
                icon={PiggyBank}
                title="See your savings potential"
                description="Your budget is compared with 20,000 Indian households of similar income, city tier and occupation to estimate how much you could realistically save in each category."
                action={<Button icon={Calculator} onClick={run} loading={busy}>Analyse my budget</Button>}
              />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label="Current savings rate" value={`${(result.savings_rate * 100).toFixed(1)}%`} hint={`${inr(result.disposable)} / month left`} />
                <Stat label="Potential extra savings" value={inr(result.potential_monthly_saving)} hint="per month" />
                <Stat label="Projected savings rate" value={`${(result.projected_savings_rate * 100).toFixed(1)}%`} hint={`Peers aim for ${result.peer_group.median_desired_savings_pct.toFixed(0)}%`} />
                <Stat label="Extra per year" value={inr(result.projected_annual_extra)} hint="if you act on every category" />
              </div>

              <Card>
                <CardHeader
                  title="You vs similar households"
                  subtitle={`Monthly spend per category, against the median of ${result.peer_group.size.toLocaleString('en-IN')} peers`}
                  action={<Legend items={[{ label: 'You', color: SERIES[0] }, { label: 'Peers (median)', color: SERIES[2] }]} />}
                />
                <div className="h-72 px-2 pb-4 pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barGap={2} barCategoryGap="24%">
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fill: 'var(--chart-text)', fontSize: 10 }} />
                      <YAxis {...axisProps} tickFormatter={inrCompact} width={52} />
                      <Tooltip content={<ChartTooltip valueFormatter={(v) => inr(v)} />} cursor={{ fill: 'rgb(var(--muted) / 0.6)' }} />
                      <Bar dataKey="You" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                      <Bar dataKey="Peers" name="Peers (median)" fill="var(--series-3)" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <CardHeader title="Where to save" subtitle="Model estimate of realistic monthly savings per category" />
                <ul className="divide-y divide-border px-5 pb-3 pt-2">
                  {[...result.categories].filter((c) => !c.fixed).sort((a, b) => b.potential_saving - a.potential_saving).map((c) => {
                    const over = c.share - c.peer_share;
                    return (
                      <li key={c.key} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{c.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {inr(c.spend)} ({(c.share * 100).toFixed(1)}% of income) · peers {(c.peer_share * 100).toFixed(1)}%
                            {over > 0.01 && <span className="ml-1 font-medium text-warning">· {(over * 100).toFixed(1)} pts above peers</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={cn('tabular text-sm font-semibold', c.potential_saving > 0 ? 'text-success' : 'text-muted-foreground')}>{c.potential_saving > 0 ? `+${inr(c.potential_saving)}` : '—'}</div>
                          <div className="text-[11px] text-muted-foreground">per month</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Peer group: {result.peer_group.same_occupation ? 'same occupation, ' : ''}city tier, income ±{Math.round((result.peer_group.income_band || 0.6) * 100)}%</span>
                <span className="flex items-center gap-1"><Info className="h-3.5 w-3.5" /> {result.model.name}, {(result.model.households || 0).toLocaleString('en-IN')} household budgets</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
