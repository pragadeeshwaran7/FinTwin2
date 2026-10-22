import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Atom, CheckCircle2, Cpu, FileUp, Info, Link2, Play, Plus, Trash2, Wallet, X, XCircle } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Notice, PageHeader, Segmented, Spinner } from '../components/ui';
import { axisProps, ChartTooltip, gridProps, Legend } from '../components/charts';
import SymbolSearch from '../components/SymbolSearch';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { cn, inr, money, pct } from '../lib/format';

const PRESETS = {
  'India large caps': ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ITC.NS', 'SUNPHARMA.NS', 'LT.NS', 'MARUTI.NS'],
  'US mega caps': ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'JPM', 'TSLA'],
  'Global mix': ['RELIANCE.NS', 'HDFCBANK.NS', 'AAPL', 'MSFT', 'HSBA.L', 'AZN.L', 'SAP.DE', '7203.T'],
};

function Metric({ label, value, sub, tone }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('tabular mt-0.5 text-base font-semibold', tone)}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Holdings({ onOptimise }) {
  const { data, error, loading, reload } = useApi('/portfolio/holdings');
  const [form, setForm] = useState({ symbol: '', quantity: '', avgPrice: '' });
  const [msg, setMsg] = useState(null);
  const file = useRef(null);

  const importCsv = async (f) => {
    setMsg(null);
    try {
      const r = await api('/portfolio/holdings/import', { method: 'POST', body: { content: await f.text() } });
      setMsg({ tone: 'success', text: `Imported ${r.imported} holdings.` });
      reload();
    } catch (err) {
      setMsg({ tone: 'danger', text: err.message });
    }
  };
  const add = async (e) => {
    e.preventDefault();
    try {
      await api('/portfolio/holdings', { method: 'POST', body: form });
      setForm({ symbol: '', quantity: '', avgPrice: '' });
      reload();
    } catch (err) {
      setMsg({ tone: 'danger', text: err.message });
    }
  };
  const remove = async (id) => {
    await api(`/portfolio/holdings/${id}`, { method: 'DELETE' });
    reload();
  };

  if (loading && !data) return <Spinner />;
  if (error) return <Notice tone="danger">{error.message}</Notice>;
  const rows = data.holdings;
  return (
    <div className="space-y-6">
      {data.totals.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {data.totals.map((t) => (
            <Metric key={t.currency} label={`Value (${t.currency})`} value={money(t.value, t.currency)} sub={t.cost ? `P&L ${money(t.value - t.cost, t.currency)} (${pct(((t.value - t.cost) / t.cost) * 100)})` : `Today ${money(t.dayPnl, t.currency)}`} tone={t.cost && t.value >= t.cost ? 'text-success' : ''} />
          ))}
        </div>
      )}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Card>
        <CardHeader
          title="Holdings"
          subtitle="Import a broker export (Zerodha Console, Groww, Upstox…) or add positions manually"
          action={
            <div className="flex flex-wrap gap-2">
              <input ref={file} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && importCsv(e.target.files[0])} />
              <Button size="sm" variant="outline" icon={FileUp} onClick={() => file.current.click()}>Import CSV</Button>
              <Link to="/connections"><Button size="sm" variant="outline" icon={Link2}>Connect broker</Button></Link>
              <Button size="sm" icon={Atom} disabled={rows.length < 2} onClick={() => onOptimise(rows.map((h) => h.symbol).slice(0, 12))}>Optimise</Button>
            </div>
          }
        />
        {rows.length === 0 ? (
          <EmptyState icon={Wallet} title="No holdings yet" description="Import a CSV with columns like Instrument, Qty., Avg. cost, add one below, or connect Zerodha." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-y border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <tr><th className="px-5 py-2 font-medium">Holding</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-right font-medium">Avg cost</th><th className="px-3 py-2 text-right font-medium">Price</th><th className="px-3 py-2 text-right font-medium">Value</th><th className="px-3 py-2 text-right font-medium">P&L</th><th className="w-10" /></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td className="px-5 py-2.5"><div className="font-medium">{h.symbol}</div><div className="text-xs text-muted-foreground">{h.name} · {h.source}</div></td>
                    <td className="tabular px-3 py-2.5 text-right">{h.quantity}</td>
                    <td className="tabular px-3 py-2.5 text-right">{h.avgPrice ? money(h.avgPrice, h.currency) : '—'}</td>
                    <td className="tabular px-3 py-2.5 text-right">{money(h.price, h.currency)}<div className={cn('text-xs', h.changePercent >= 0 ? 'text-success' : 'text-danger')}>{pct(h.changePercent, 2)}</div></td>
                    <td className="tabular px-3 py-2.5 text-right font-medium">{money(h.value, h.currency)}</td>
                    <td className={cn('tabular px-3 py-2.5 text-right', h.pnl >= 0 ? 'text-success' : 'text-danger')}>{h.pnl !== null ? money(h.pnl, h.currency) : '—'}</td>
                    <td className="px-2"><button onClick={() => remove(h.id)} className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger" aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form onSubmit={add} className="grid gap-3 border-t border-border p-5 sm:grid-cols-[2fr,1fr,1fr,auto] sm:items-end">
          <Field label="Symbol (e.g. INFY.NS, AAPL, VOD.L)"><Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} /></Field>
          <Field label="Quantity"><Input type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
          <Field label="Avg cost (optional)"><Input type="number" min="0" step="any" value={form.avgPrice} onChange={(e) => setForm({ ...form, avgPrice: e.target.value })} /></Field>
          <Button type="submit" icon={Plus} disabled={!form.symbol || !form.quantity}>Add</Button>
        </form>
      </Card>
    </div>
  );
}

function Optimiser({ initial }) {
  const [selected, setSelected] = useState(initial?.length ? initial : PRESETS['India large caps']);
  const [k, setK] = useState(4);
  const [budget, setBudget] = useState(100000);
  const [risk, setRisk] = useState(0.5);
  const [layers, setLayers] = useState(2);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial?.length) setSelected(initial);
  }, [initial]);

  const maxK = Math.max(1, selected.length - 1);
  const kk = Math.min(k, maxK);
  const run = async () => {
    setBusy(true);
    setError('');
    try {
      setResult((await api('/ml/optimize', { method: 'POST', body: { tickers: selected, k: kk, budget, riskAversion: risk, layers } })).data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const states = result?.top_states.map((s) => ({ ...s, label: s.assets.map((a) => a.replace('.NS', '')).join(' + '), probPct: s.probability * 100, isBest: s.assets.join() === result.optimum_assets.join() })) || [];
  const chosen = result?.allocation.filter((a) => a.selected) || [];

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="self-start p-5">
        <div className="text-sm font-semibold">1. Shortlist ({selected.length}/12): each asset is one qubit</div>
        <SymbolSearch className="mt-3" placeholder="Add any stock: AAPL, INFY.NS, HSBA.L…" onSelect={(r) => setSelected((s) => (s.includes(r.symbol) || s.length >= 12 ? s : [...s, r.symbol]))} />
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
              {s}
              <button onClick={() => setSelected(selected.filter((x) => x !== s))} aria-label={`Remove ${s}`}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(PRESETS).map((p) => <button key={p} onClick={() => setSelected(PRESETS[p])} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">{p}</button>)}
        </div>
        <div className="mt-6 space-y-5">
          <Field label={`2. Hold exactly K = ${kk} of ${selected.length}`}><input type="range" min={1} max={maxK} value={kk} onChange={(e) => setK(Number(e.target.value))} className="w-full accent-[rgb(var(--primary))]" /></Field>
          <Field label="3. Budget (₹)"><Input type="number" min={1000} step={1000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></Field>
          <Field label={`Risk aversion λ = ${risk.toFixed(2)}`} hint="0 = return only · higher = penalise volatility and correlation"><input type="range" min={0} max={3} step={0.05} value={risk} onChange={(e) => setRisk(Number(e.target.value))} className="w-full accent-[rgb(var(--primary))]" /></Field>
          <Field label={`QAOA depth p = ${layers}`} hint="Layers are warm-started from the previous depth"><input type="range" min={1} max={4} value={layers} onChange={(e) => setLayers(Number(e.target.value))} className="w-full accent-[rgb(var(--primary))]" /></Field>
          <Button className="w-full" icon={Play} onClick={run} loading={busy} disabled={selected.length < 2}>{busy ? 'Running quantum circuit…' : 'Optimise portfolio'}</Button>
          {error && <Notice tone="danger">{error}</Notice>}
        </div>
      </Card>

      <div className="space-y-6 xl:col-span-2">
        {!result ? (
          <Card>
            <EmptyState icon={Atom} title="Run the optimiser" description="FinTwin estimates returns and covariance from one year of prices, encodes the mean-variance objective as a cost Hamiltonian, and runs QAOA on an exact statevector simulator." />
          </Card>
        ) : (
          <>
            {result.mixed_currencies && <Notice tone="warning">Assets trade in different currencies ({result.mixed_currencies.join(', ')}). Returns are measured in each local currency, and the budget split ignores FX.</Notice>}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Expected return (annual)" value={pct(result.portfolio.expected_return * 100)} sub={`Equal weight: ${pct(result.equal_weight.expected_return * 100)}`} tone={result.portfolio.expected_return >= 0 ? 'text-success' : 'text-danger'} />
              <Metric label="Volatility (annual)" value={pct(result.portfolio.volatility * 100, 1, false)} sub={`Equal weight: ${pct(result.equal_weight.volatility * 100, 1, false)}`} />
              <Metric label="Sharpe ratio" value={result.portfolio.sharpe?.toFixed(2) ?? '—'} sub={`Equal weight: ${result.equal_weight.sharpe?.toFixed(2) ?? '—'}`} />
              <Metric label="Found the true optimum?" value={result.found_optimum ? 'Yes' : `${(result.approximation_ratio * 100).toFixed(0)}% of best`} sub={`QAOA ${(result.qaoa_find_probability * 100).toFixed(0)}% vs random ${(result.random_guess_find_probability * 100).toFixed(0)}% (${result.shots} shots)`} tone={result.found_optimum ? 'text-success' : ''} />
            </div>
            <Card>
              <CardHeader title="Recommended allocation" subtitle={`Inverse-volatility weights across the ${chosen.length} selected assets`} action={result.found_optimum ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Optimal</Badge> : <Badge tone="warning"><Info className="h-3 w-3" /> Near-optimal</Badge>} />
              <div className="overflow-x-auto">
                <table className="mt-3 w-full min-w-[620px] text-sm">
                  <thead className="border-y border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr><th className="px-5 py-2 font-medium">Asset</th><th className="px-3 py-2 font-medium">Weight</th><th className="px-3 py-2 text-right font-medium">Amount</th><th className="px-3 py-2 text-right font-medium">1y return</th><th className="px-5 py-2 text-right font-medium">Volatility</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...result.allocation].sort((a, b) => b.weight - a.weight).map((a) => (
                      <tr key={a.ticker} className={cn(!a.selected && 'text-muted-foreground')}>
                        <td className="px-5 py-2.5"><div className="flex items-center gap-2">{a.selected ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground/60" />}<div><div className="font-medium text-foreground">{a.ticker}</div><div className="text-xs text-muted-foreground">{a.name}</div></div></div></td>
                        <td className="px-3 py-2.5"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded-full bg-muted"><div className="h-1.5 rounded-full" style={{ width: `${a.weight * 100}%`, background: 'var(--series-1)' }} /></div><span className="tabular text-xs">{(a.weight * 100).toFixed(1)}%</span></div></td>
                        <td className="tabular px-3 py-2.5 text-right">{a.selected ? inr(a.amount) : '—'}</td>
                        <td className={cn('tabular px-3 py-2.5 text-right', a.expected_return >= 0 ? 'text-success' : 'text-danger')}>{pct(a.expected_return * 100)}</td>
                        <td className="tabular px-5 py-2.5 text-right">{pct(a.volatility * 100, 1, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card>
              <CardHeader title="Measurement distribution" subtitle={`Most likely outcomes over ${result.feasible_portfolios} possible ${result.k}-asset portfolios (uniform = ${(result.uniform_probability * 100).toFixed(2)}%)`} action={<Legend items={[{ label: 'True optimum', color: 'var(--series-3)' }, { label: 'Other portfolio', color: 'var(--series-1)' }]} />} />
              <div className="h-64 px-2 pb-2 pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={states} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid {...gridProps} horizontal={false} vertical />
                    <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                    <YAxis type="category" dataKey="label" {...axisProps} width={200} tick={{ fill: 'var(--chart-text)', fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v.toFixed(2)}%`} />} cursor={{ fill: 'rgb(var(--muted) / 0.6)' }} />
                    <Bar dataKey="probPct" name="Probability" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                      {states.map((s) => <Cell key={s.bitstring} fill={s.isBest ? 'var(--series-3)' : 'var(--series-1)'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border px-5 py-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> {result.solver}</span>
                <span>{result.qubits} qubits · p = {result.layers} · {result.optimizer.method}</span>
                <span>P(optimum) {(result.optimum_probability * 100).toFixed(2)}% = {(result.optimum_probability / result.uniform_probability).toFixed(1)}× chance</span>
                <span>{result.elapsed_ms} ms</span>
              </div>
            </Card>
            <Notice>Returns and risk are estimated from the past year and do not predict future performance. Educational optimiser, not investment advice.</Notice>
          </>
        )}
      </div>
    </div>
  );
}

export default function Portfolio() {
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tickers ? 'optimise' : 'holdings');
  const [tickers, setTickers] = useState(location.state?.tickers || null);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Portfolio" subtitle="Your holdings, and a quantum (QAOA) optimiser for any mix of global assets" actions={<Segmented value={tab} onChange={setTab} options={[{ value: 'holdings', label: 'My holdings' }, { value: 'optimise', label: 'QAOA optimiser' }]} />} />
      {tab === 'holdings' ? <Holdings onOptimise={(t) => { setTickers(t); setTab('optimise'); }} /> : <Optimiser initial={tickers} />}
    </div>
  );
}
