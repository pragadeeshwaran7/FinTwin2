// Personal-finance analytics over a user's transactions. Everything here is pure
// so it can be shared by the REST API, the AI assistant and the MCP server.

const DAY = 86400e3;
export const RANGES = { '7d': 7, '30d': 30, '90d': 90, '6m': 182, '1y': 365, all: Infinity };

const iso = (d) => new Date(d).toISOString().slice(0, 10);
const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
const isExpense = (t) => t.type === 'expense';
const isIncome = (t) => t.type === 'income';

export function latestDate(txns) {
  return txns.reduce((max, t) => (t.date > max ? t.date : max), '') || iso(Date.now());
}

/** Resolve a named range to [from, to]; anchored on the newest transaction so imported history works. */
export function resolveRange(txns, range = '30d', from, to) {
  if (from || to) return { from: from || '0000-01-01', to: to || latestDate(txns) };
  const end = latestDate(txns);
  const days = RANGES[range] ?? 30;
  if (!Number.isFinite(days)) return { from: '0000-01-01', to: end };
  return { from: iso(Date.parse(end) - (days - 1) * DAY), to: end };
}

export function filterTransactions(txns, q = {}) {
  const search = (q.search || '').toLowerCase().trim();
  const cats = q.category ? String(q.category).split(',').filter(Boolean) : null;
  const min = q.minAmount !== undefined && q.minAmount !== '' ? Number(q.minAmount) : null;
  const max = q.maxAmount !== undefined && q.maxAmount !== '' ? Number(q.maxAmount) : null;
  return txns.filter((t) => {
    if (q.from && t.date < q.from) return false;
    if (q.to && t.date > q.to) return false;
    if (cats && !cats.includes(t.category)) return false;
    if (q.type && q.type !== 'all' && t.type !== q.type) return false;
    if (q.account && q.account !== 'all' && t.account !== q.account) return false;
    if (min !== null && Math.abs(t.amount) < min) return false;
    if (max !== null && Math.abs(t.amount) > max) return false;
    if (search && !`${t.description} ${t.category} ${t.subcategory || ''} ${t.account}`.toLowerCase().includes(search))
      return false;
    return true;
  });
}

export function sortTransactions(txns, sortBy = 'date', dir = 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  const key = { date: (t) => t.date, amount: (t) => t.amount, description: (t) => t.description.toLowerCase(), category: (t) => t.category }[sortBy] || ((t) => t.date);
  return [...txns].sort((a, b) => (key(a) > key(b) ? sign : key(a) < key(b) ? -sign : 0));
}

export function metrics(txns) {
  const income = txns.filter(isIncome).reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter(isExpense).reduce((s, t) => s + Math.abs(t.amount), 0);
  const expenseCount = txns.filter(isExpense).length;
  return {
    totalIncome: round(income),
    totalExpenses: round(expenses),
    netIncome: round(income - expenses),
    savingsRate: income > 0 ? round(((income - expenses) / income) * 100, 1) : null,
    transactionCount: txns.length,
    averageExpense: expenseCount ? round(expenses / expenseCount) : 0,
  };
}

const pctChange = (now, before) => (before ? round(((now - before) / Math.abs(before)) * 100, 1) : null);

export function categoryBreakdown(txns, limit = 7) {
  const by = new Map();
  for (const t of txns.filter(isExpense)) {
    const e = by.get(t.category) || { category: t.category, amount: 0, count: 0 };
    e.amount += Math.abs(t.amount);
    e.count++;
    by.set(t.category, e);
  }
  const total = [...by.values()].reduce((s, c) => s + c.amount, 0);
  const sorted = [...by.values()].sort((a, b) => b.amount - a.amount);
  const head = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  if (rest.length) head.push({ category: 'Other', amount: rest.reduce((s, c) => s + c.amount, 0), count: rest.reduce((s, c) => s + c.count, 0), merged: rest.length });
  return head.map((c) => ({ ...c, amount: round(c.amount), percentage: total ? round((c.amount / total) * 100, 1) : 0 }));
}

export function dailySpending(txns, from, to) {
  const by = new Map();
  for (const t of txns.filter(isExpense)) by.set(t.date, (by.get(t.date) || 0) + Math.abs(t.amount));
  const start = Date.parse(from > '1900' ? from : txns.reduce((m, t) => (t.date < m ? t.date : m), to));
  const end = Date.parse(to);
  const days = Math.round((end - start) / DAY) + 1;
  if (days > 400) {
    // Long ranges: aggregate weekly so the chart stays readable.
    const weeks = new Map();
    for (const [d, v] of by) {
      const wk = iso(Date.parse(d) - new Date(d).getUTCDay() * DAY);
      weeks.set(wk, (weeks.get(wk) || 0) + v);
    }
    return [...weeks].sort().map(([date, amount]) => ({ date, amount: round(amount) }));
  }
  const out = [];
  for (let t = start; t <= end; t += DAY) out.push({ date: iso(t), amount: round(by.get(iso(t)) || 0) });
  return out;
}

export function monthlyTrend(txns, months = 12) {
  const by = new Map();
  for (const t of txns) {
    if (t.type === 'transfer') continue;
    const m = t.date.slice(0, 7);
    const e = by.get(m) || { month: m, income: 0, expenses: 0 };
    if (isIncome(t)) e.income += t.amount;
    else e.expenses += Math.abs(t.amount);
    by.set(m, e);
  }
  return [...by.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .slice(-months)
    .map((e) => ({ ...e, income: round(e.income), expenses: round(e.expenses), net: round(e.income - e.expenses) }));
}

export function recurringPayments(txns) {
  const groups = new Map();
  for (const t of txns.filter(isExpense)) {
    const key = t.description.toLowerCase().replace(/\d+/g, '').trim();
    if (key.length < 3 || key === 'transaction') continue;
    const g = groups.get(key) || { description: t.description, category: t.category, months: new Set(), amounts: [] };
    g.months.add(t.date.slice(0, 7));
    g.amounts.push(Math.abs(t.amount));
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) => g.months.size >= 3)
    .map((g) => ({ description: g.description, category: g.category, months: g.months.size, averageAmount: round(g.amounts.reduce((s, a) => s + a, 0) / g.amounts.length) }))
    .sort((a, b) => b.months - a.months)
    .slice(0, 8);
}

export function unusualTransactions(txns, window) {
  const stats = new Map();
  for (const t of txns.filter(isExpense)) {
    const s = stats.get(t.category) || { n: 0, sum: 0, sq: 0 };
    const a = Math.abs(t.amount);
    s.n++;
    s.sum += a;
    s.sq += a * a;
    stats.set(t.category, s);
  }
  return window
    .filter(isExpense)
    .map((t) => {
      const s = stats.get(t.category);
      if (!s || s.n < 8) return null;
      const mean = s.sum / s.n;
      const sd = Math.sqrt(Math.max(s.sq / s.n - mean * mean, 0));
      const z = sd ? (Math.abs(t.amount) - mean) / sd : 0;
      return z >= 3 ? { ...t, zscore: round(z, 1), typical: round(mean) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.zscore - a.zscore)
    .slice(0, 5);
}

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function insights(all, current, previous) {
  const out = [];
  const m = metrics(current);
  const pm = metrics(previous);
  if (m.savingsRate !== null) {
    out.push({
      kind: m.savingsRate >= 20 ? 'positive' : m.savingsRate >= 0 ? 'warning' : 'negative',
      icon: 'PiggyBank',
      title: `Savings rate ${m.savingsRate}%`,
      detail: m.savingsRate >= 20
        ? `You kept ${inr(m.netIncome)} of ${inr(m.totalIncome)} earned in this period. That beats the common 20% target.`
        : m.savingsRate >= 0
          ? `You saved ${inr(m.netIncome)}. Raising this to 20% would mean trimming about ${inr(m.totalIncome * 0.2 - m.netIncome)}.`
          : `Spending exceeded income by ${inr(-m.netIncome)} in this period.`,
    });
  }
  const now = new Map(categoryBreakdown(current, 50).map((c) => [c.category, c.amount]));
  const before = new Map(categoryBreakdown(previous, 50).map((c) => [c.category, c.amount]));
  let biggest = null;
  for (const [cat, amt] of now) {
    const prev = before.get(cat) || 0;
    if (amt - prev > 0 && (!biggest || amt - prev > biggest.delta)) biggest = { cat, delta: amt - prev, prev, pct: pctChange(amt, prev) };
  }
  // Only flag rises that are material relative to overall spending.
  if (biggest && biggest.delta >= Math.max(500, m.totalExpenses * 0.1) && (biggest.pct === null || biggest.pct >= 15)) {
    const meaningfulPct = biggest.prev >= Math.max(500, pm.totalExpenses * 0.03);
    out.push({
      kind: 'warning', icon: 'TrendingUp',
      title: meaningfulPct ? `${biggest.cat} up ${biggest.pct}%` : `${biggest.cat} spending jumped`,
      detail: `You spent ${inr(biggest.delta)} more on ${biggest.cat.toLowerCase()} than in the previous period${meaningfulPct ? '' : ` (only ${inr(biggest.prev)} before)`}.`,
    });
  }
  const expChange = pctChange(m.totalExpenses, pm.totalExpenses);
  if (expChange !== null && expChange <= -10) {
    out.push({ kind: 'positive', icon: 'TrendingDown', title: `Spending down ${Math.abs(expChange)}%`, detail: `Total expenses fell from ${inr(pm.totalExpenses)} to ${inr(m.totalExpenses)}.` });
  }
  const unusual = unusualTransactions(all, current);
  if (unusual.length) {
    const u = unusual[0];
    out.push({ kind: 'warning', icon: 'AlertTriangle', title: 'Unusual transaction', detail: `${u.description} (${inr(Math.abs(u.amount))}) on ${u.date} is ${u.zscore}× the usual spread for ${u.category} (typical ${inr(u.typical)}).` });
  }
  const top = categoryBreakdown(current, 1)[0];
  if (top && top.percentage >= 30) {
    out.push({ kind: 'info', icon: 'PieChart', title: `${top.category} dominates spending`, detail: `${top.percentage}% of expenses (${inr(top.amount)}) went to ${top.category.toLowerCase()}.` });
  }
  return out.slice(0, 4);
}

export function dashboard(txns, { range = '30d', from, to } = {}) {
  const window = resolveRange(txns, range, from, to);
  const current = filterTransactions(txns, window);
  const spanDays = Number.isFinite(RANGES[range]) || from ? Math.round((Date.parse(window.to) - Date.parse(window.from)) / DAY) + 1 : null;
  const previous = spanDays
    ? filterTransactions(txns, { from: iso(Date.parse(window.from) - spanDays * DAY), to: iso(Date.parse(window.from) - DAY) })
    : [];
  const m = metrics(current);
  const pm = metrics(previous);
  return {
    range: { ...window, name: range },
    metrics: m,
    previousMetrics: previous.length ? pm : null,
    changes: previous.length
      ? { totalIncome: pctChange(m.totalIncome, pm.totalIncome), totalExpenses: pctChange(m.totalExpenses, pm.totalExpenses), netIncome: pctChange(m.netIncome, pm.netIncome), savingsRate: m.savingsRate !== null && pm.savingsRate !== null ? round(m.savingsRate - pm.savingsRate, 1) : null }
      : null,
    spending: dailySpending(current, window.from, window.to),
    categories: categoryBreakdown(current),
    trends: monthlyTrend(txns, 12),
    recentTransactions: sortTransactions(current).slice(0, 8),
    insights: insights(txns, current, previous),
    recurring: recurringPayments(txns),
    accounts: [...new Set(txns.map((t) => t.account))].length,
  };
}

/** Average monthly spend over the last N months, mapped onto the savings-model categories. */
export function savingsProfile(txns, months = 3) {
  const end = latestDate(txns);
  const from = iso(Date.parse(end) - months * 30 * DAY);
  const recent = filterTransactions(txns, { from, to: end });
  const income = recent.filter(isIncome).reduce((s, t) => s + t.amount, 0) / months;
  const buckets = { Rent: 0, Loan_Repayment: 0, Insurance: 0, Groceries: 0, Transport: 0, Eating_Out: 0, Entertainment: 0, Utilities: 0, Healthcare: 0, Education: 0, Miscellaneous: 0 };
  const rules = [
    [/rent|mortgage/i, 'Rent'], [/loan|emi/i, 'Loan_Repayment'], [/insurance|lic/i, 'Insurance'],
    [/snack|dinner|lunch|breakfast|restaurant|eating|swiggy|zomato|cafe|coffee/i, 'Eating_Out'],
    [/food|grocer|vegetable|milk|fruit/i, 'Groceries'], [/transport|travel|fuel|train|bus|auto|cab|uber|ola/i, 'Transport'],
    [/entertain|movie|festival|culture|tourism|subscription|netflix/i, 'Entertainment'],
    [/utilit|electric|water|gas|phone|mobile|internet|recharge|household|maid/i, 'Utilities'],
    [/health|medic|pharma|doctor/i, 'Healthcare'], [/educat|school|course|books?/i, 'Education'],
  ];
  for (const t of recent.filter(isExpense)) {
    const text = `${t.subcategory || ''} ${t.category} ${t.description}`;
    if (/invest|deposit|mutual fund|provident|sip|saving/i.test(t.category)) continue;
    const hit = rules.find(([re]) => re.test(`${t.subcategory || ''}`)) || rules.find(([re]) => re.test(text));
    buckets[hit ? hit[1] : 'Miscellaneous'] += Math.abs(t.amount) / months;
  }
  for (const k of Object.keys(buckets)) buckets[k] = Math.round(buckets[k]);
  return { income: Math.round(income), expenses: buckets, months, from, to: end };
}
