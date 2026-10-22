// Bank-statement understanding, entirely client-side.
// Detects transaction lines (date + amounts), uses the running balance to tell
// debits from credits, categorises merchants, and summarises the statement.

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, '0');
const DATE_RE = /^(\d{1,2})[/\-. ](\d{1,2}|[A-Za-z]{3,4})[/\-. ,]{1,2}(\d{2,4})\b|^(\d{4})-(\d{2})-(\d{2})\b/;
const MONEY_RE = /(?<![\d/])-?\(?(?:₹|rs\.?|inr|\$|£|€)?\s?\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})\)?(?:\s?(?:cr|dr))?(?![\d/])/gi;

export function parseDate(s) {
  const m = s.trim().match(DATE_RE);
  if (!m) return null;
  if (m[4]) return `${m[4]}-${m[5]}-${m[6]}`;
  let [d, mo, y] = [Number(m[1]), m[2], m[3]];
  mo = /^\d+$/.test(mo) ? Number(mo) : MONTHS[mo.toLowerCase()];
  if (!mo || mo > 12 || d > 31) return null;
  y = y.length === 2 ? 2000 + Number(y) : Number(y);
  if (y < 1990 || y > 2100) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

const toNumber = (raw) => {
  const neg = /^-|\(.*\)|dr$/i.test(raw.trim());
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return { value: neg ? -n : n, cr: /cr$/i.test(raw.trim()), dr: /dr$/i.test(raw.trim()) };
};

const CATS = [
  [/salary|payroll|sal cr|neft.*(sal|payroll)/i, 'Salary', 'income'],
  [/interest|int\.? ?pd|int cr/i, 'Interest', 'income'],
  [/refund|reversal|cashback/i, 'Refund', 'income'],
  [/swiggy|zomato|restaurant|cafe|food|eat|dominos|mcdonald|kfc/i, 'Food'],
  [/bigbasket|blinkit|zepto|dmart|grocer|more retail|reliance fresh|jiomart/i, 'Groceries'],
  [/uber|ola|rapido|irctc|metro|fuel|petrol|hpcl|bpcl|iocl|fastag|indigo|airways/i, 'Transportation'],
  [/amazon|flipkart|myntra|ajio|nykaa|meesho/i, 'Shopping'],
  [/netflix|spotify|hotstar|prime|youtube|apple\.com|google play/i, 'Subscription'],
  [/airtel|jio|vodafone|vi |bsnl|electricity|bescom|tneb|msedcl|water|gas|broadband|recharge/i, 'Utilities'],
  [/rent|landlord|nobroker/i, 'Rent'],
  [/\bemi\b|\bloan\b|bajaj fin|hdfc ltd/i, 'Loan EMI'],
  [/insurance|lic |policy|premium/i, 'Insurance'],
  [/hospital|pharma|apollo|medplus|clinic|1mg|netmeds/i, 'Health'],
  [/school|college|tuition|course|udemy|byju/i, 'Education'],
  [/zerodha|groww|upstox|mutual fund|sip|ppf|nps|fd |fixed deposit|rd /i, 'Investment', 'transfer'],
  [/atm|cash wdl|cash withdrawal/i, 'Cash'],
  [/upi|imps|neft|rtgs/i, 'Transfers'],
];

export function categorise(description) {
  for (const [re, cat, type] of CATS) if (re.test(description)) return { category: cat, type };
  return { category: 'Other' };
}

const NOISE = /balance|statement|total|opening|closing|page \d|computer generated|narration|withdrawal|deposit|chq|value dt|amt\.?$/i;
const hasNarration = (s) => (s.replace(DATE_RE, '').replace(MONEY_RE, ' ').replace(/\b\d{5,}\b/g, ' ').replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g, ' ').match(/[A-Za-z]/g) || []).length >= 3;

/**
 * Extract transactions from statement pages [{page, lines}].
 * Pass 1 finds dated lines with amounts; pass 2 assigns wrapped narration
 * lines. PDF table cells are vertically centred, so a long narration splits
 * into text above and below its date line.
 */
export function extractTransactions(pages) {
  const seq = [];
  let prevBalance = null;
  for (const { page, lines } of pages) {
    for (const rawLine of lines) {
      const line = rawLine.replace(/\s*\|\s*/g, '  ');
      const date = parseDate(line);
      const rest = date ? line.replace(DATE_RE, '').trim() : line;
      const nums = date ? [...rest.matchAll(MONEY_RE)].map((m) => ({ raw: m[0], ...toNumber(m[0]) })).filter((n) => Number.isFinite(n.value) && /[.,]/.test(n.raw)) : [];
      if (!date || !nums.length) {
        if (!date && line.length < 120 && !NOISE.test(line) && /[A-Za-z]/.test(line)) seq.push({ kind: 'text', page, line });
        else seq.push({ kind: 'break' });
        continue;
      }
      if (/opening balance|closing balance|b\/f|c\/f|brought forward/i.test(rest)) {
        prevBalance = nums.at(-1).value;
        seq.push({ kind: 'break' });
        continue;
      }
      const balance = nums.length >= 2 ? nums.at(-1).value : null;
      const amt = nums.length >= 2 ? nums.at(-2) : nums[0];
      let amount = Math.abs(amt.value);
      let direction = amt.cr ? 'credit' : amt.dr || amt.value < 0 ? 'debit' : null;
      if (balance !== null && prevBalance !== null) {
        if (Math.abs(prevBalance - amount - balance) < 0.02) direction = 'debit';
        else if (Math.abs(prevBalance + amount - balance) < 0.02) direction = 'credit';
      }
      if (nums.length >= 3 && balance !== null && prevBalance !== null) {
        const [w, d] = [Math.abs(nums.at(-3).value), Math.abs(nums.at(-2).value)];
        if (Math.abs(prevBalance - w - balance) < 0.02) [amount, direction] = [w, 'debit'];
        else if (Math.abs(prevBalance + d - balance) < 0.02) [amount, direction] = [d, 'credit'];
      }
      const own = rest.replace(MONEY_RE, ' ').replace(/\b\d{5,}\b/g, ' ').replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g, ' ').replace(/\s{2,}/g, ' ').trim();
      seq.push({ kind: 'txn', page, date, own: hasNarration(rest) ? own : '', wrapped: !hasNarration(rest), amount, direction, balance, verified: balance !== null && prevBalance !== null, head: [], tail: [] });
      if (balance !== null) prevBalance = balance;
    }
  }
  // Pass 2: distribute each run of text lines between the transactions around it.
  let prev = null;
  let buffer = [];
  const flush = (next) => {
    if (!buffer.length) return;
    const lines = buffer.map((b) => b.line);
    if (prev && next && prev.wrapped && next.wrapped) {
      const cut = Math.ceil(lines.length / 2);
      prev.tail.push(...lines.slice(0, cut));
      next.head.push(...lines.slice(cut));
    } else if (next?.wrapped) next.head.push(...lines.slice(prev ? 0 : -1));
    else if (prev?.wrapped || (prev && lines.length === 1)) prev.tail.push(...lines.slice(0, next ? lines.length : 1));
    buffer = [];
  };
  for (const item of seq) {
    if (item.kind === 'text') buffer.push(item);
    else if (item.kind === 'break') {
      flush(null);
      prev = null;
    } else {
      flush(item);
      prev = item;
    }
  }
  flush(null);

  return seq.filter((x) => x.kind === 'txn').map((t) => {
    const description = [...t.head, t.own, ...t.tail].filter(Boolean).join(' ').replace(/\s{2,}/g, ' ').slice(0, 200) || 'Transaction';
    const cat = categorise(description);
    const type = t.direction === 'credit' ? (cat.type === 'transfer' ? 'transfer' : 'income') : cat.type === 'transfer' ? 'transfer' : 'expense';
    return { date: t.date, description, amount: t.direction === 'credit' ? t.amount : -t.amount, type, category: cat.category, balance: t.balance, page: t.page, verified: t.verified };
  });
}

export function looksLikeStatement(pages) {
  const text = pages.slice(0, 2).map((p) => p.text).join('\n').toLowerCase();
  const dated = pages.slice(0, 3).flatMap((p) => p.lines).filter((l) => parseDate(l)).length;
  return dated >= 5 && /(statement|account|balance|withdrawal|deposit|debit|credit|narration|txn)/.test(text);
}

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function summarise(txns) {
  if (!txns.length) return null;
  const dates = txns.map((t) => t.date).sort();
  const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spend = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const byCat = {};
  for (const t of txns.filter((x) => x.type === 'expense')) byCat[t.category] = (byCat[t.category] || 0) + Math.abs(t.amount);
  const categories = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));
  const largest = [...txns].filter((t) => t.type === 'expense').sort((a, b) => a.amount - b.amount).slice(0, 5);
  const balances = txns.filter((t) => t.balance !== null);
  return {
    from: dates[0], to: dates.at(-1), count: txns.length, income, spend, net: income - spend,
    verified: txns.filter((t) => t.verified).length,
    openingBalance: balances[0] ? balances[0].balance - balances[0].amount : null, closingBalance: balances.at(-1)?.balance ?? null,
    categories, largest,
    text: [
      `Bank statement ${dates[0]} to ${dates.at(-1)}: ${txns.length} transactions (${txns.filter((t) => t.verified).length} verified against running balance).`,
      `Money in ${inr(income)}, money out ${inr(spend)}, net ${inr(income - spend)}.`,
      balances.length ? `Closing balance ${inr(balances.at(-1).balance)}.` : '',
      `Spending by category: ${categories.slice(0, 8).map((c) => `${c.category} ${inr(c.amount)}`).join(', ')}.`,
      `Largest debits: ${largest.map((t) => `${t.date} ${t.description.slice(0, 40)} ${inr(Math.abs(t.amount))}`).join('; ')}.`,
    ].filter(Boolean).join('\n'),
  };
}
