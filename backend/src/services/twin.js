// "Your twin": a Monte Carlo clone of the user's finances. Monthly income and
// spending (and how much they vary) are learned from the user's own
// transactions; investments follow a chosen risk profile. Simulates thousands
// of possible futures to estimate net worth ranges and goal probabilities.
import { filterTransactions, latestDate } from './finance.js';

const PROFILES = {
  conservative: { label: 'Conservative (debt-heavy)', annualReturn: 0.075, annualVol: 0.05 },
  balanced: { label: 'Balanced (60/40 equity-debt)', annualReturn: 0.105, annualVol: 0.11 },
  aggressive: { label: 'Aggressive (equity)', annualReturn: 0.125, annualVol: 0.17 },
};

function randn(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Learn monthly income/expense behaviour from the last 12 months of transactions. */
export function learnBehaviour(txns) {
  const end = latestDate(txns);
  const from = new Date(Date.parse(end) - 365 * 86400e3).toISOString().slice(0, 10);
  const recent = filterTransactions(txns, { from, to: end });
  const months = new Map();
  for (const t of recent) {
    if (t.type === 'transfer') continue;
    const m = t.date.slice(0, 7);
    const e = months.get(m) || { income: 0, expenses: 0 };
    if (t.type === 'income') e.income += t.amount;
    else e.expenses += Math.abs(t.amount);
    months.set(m, e);
  }
  const vals = [...months.values()];
  const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const sd = (a) => Math.sqrt(mean(a.map((x) => (x - mean(a)) ** 2)));
  const inc = vals.map((v) => v.income);
  const exp = vals.map((v) => v.expenses);
  return {
    months: vals.length,
    income: Math.round(mean(inc)),
    incomeVol: Math.round(sd(inc)),
    expenses: Math.round(mean(exp)),
    expenseVol: Math.round(sd(exp)),
    invested: Math.round(recent.filter((t) => t.type === 'transfer' && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0) / Math.max(1, vals.length)),
  };
}

export function simulate(input) {
  const years = Math.max(1, Math.min(40, Number(input.years) || 10));
  const paths = Math.max(200, Math.min(5000, Number(input.paths) || 2000));
  const prof = PROFILES[input.profile] || PROFILES.balanced;
  const r = input.annualReturn != null ? Number(input.annualReturn) : prof.annualReturn;
  const vol = input.annualVol != null ? Number(input.annualVol) : prof.annualVol;
  const inflation = input.inflation != null ? Number(input.inflation) : 0.05;
  const incomeGrowth = input.incomeGrowth != null ? Number(input.incomeGrowth) : 0.07;
  const start = Math.max(0, Number(input.startingWealth) || 0);
  const income = Math.max(0, Number(input.income) || 0);
  const expenses = Math.max(0, Number(input.expenses) || 0);
  const incomeVol = Math.max(0, Number(input.incomeVol) || 0);
  const expenseVol = Math.max(0, Number(input.expenseVol) || 0);
  const goals = (input.goals || []).slice(0, 6).map((g) => ({ name: String(g.name || 'Goal').slice(0, 40), amount: Number(g.amount) || 0, year: Math.max(1, Math.min(years, Number(g.year) || years)) })).filter((g) => g.amount > 0);
  const events = (input.events || []).slice(0, 10).map((e) => ({ year: Number(e.year) || 1, amount: Number(e.amount) || 0, label: String(e.label || '').slice(0, 40) }));

  const muM = Math.log(1 + r) / 12 - (vol * vol) / 24;
  const sdM = vol / Math.sqrt(12);
  const rng = seeded(Number(input.seed) || 42);
  const months = years * 12;
  const yearly = Array.from({ length: years + 1 }, () => new Float64Array(paths));
  const goalHits = goals.map(() => 0);
  let depleted = 0;

  for (let p = 0; p < paths; p++) {
    let w = start;
    yearly[0][p] = w;
    let everNegative = false;
    for (let m = 1; m <= months; m++) {
      const y = (m - 1) / 12;
      const inc = Math.max(0, income * (1 + incomeGrowth) ** y + incomeVol * randn(rng));
      const exp = Math.max(0, expenses * (1 + inflation) ** y + expenseVol * randn(rng));
      w = w * Math.exp(muM + sdM * randn(rng)) + inc - exp;
      if (m % 12 === 0) {
        const yr = m / 12;
        for (const e of events) if (e.year === yr) w += e.amount;
        for (let g = 0; g < goals.length; g++) if (goals[g].year === yr && w >= goals[g].amount * (1 + inflation) ** yr) goalHits[g]++;
        yearly[yr][p] = w;
      }
      if (w < 0) everNegative = true;
    }
    if (everNegative) depleted++;
  }
  const q = (arr, f) => {
    const s = Float64Array.from(arr).sort();
    return s[Math.min(s.length - 1, Math.floor(f * s.length))];
  };
  const timeline = yearly.map((arr, y) => ({ year: y, p10: q(arr, 0.1), p25: q(arr, 0.25), p50: q(arr, 0.5), p75: q(arr, 0.75), p90: q(arr, 0.9), real_p50: q(arr, 0.5) / (1 + inflation) ** y }));
  return {
    years, paths, assumptions: { profile: prof.label, annualReturn: r, annualVol: vol, inflation, incomeGrowth, income, expenses, incomeVol, expenseVol, startingWealth: start },
    timeline,
    goals: goals.map((g, i) => ({ ...g, inflatedAmount: g.amount * (1 + inflation) ** g.year, probability: goalHits[i] / paths })),
    probabilityOfShortfall: depleted / paths,
    final: timeline.at(-1),
    profiles: Object.fromEntries(Object.entries(PROFILES).map(([k, v]) => [k, v.label])),
  };
}
