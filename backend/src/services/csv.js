// CSV parsing, column detection and normalisation for transaction imports.
// Handles the layouts used by the datasets in this project: generic
// date/description/amount exports, bank statements with withdrawal/deposit
// columns, debit/credit type columns and the household-transactions format.

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const FIELD_PATTERNS = {
  date: [/^(transaction[ _]?)?date$/i, /^txn[ _]?date$/i, /^value[ _]?date$/i, /date/i],
  description: [/^description$/i, /narration/i, /^note$/i, /^(transaction )?description/i, /^details?$/i, /^particulars$/i, /merchant/i, /^payee$/i, /^memo$/i, /^name$/i],
  amount: [/^amount$/i, /^(transaction[ _]?)?amount/i, /^amt$/i, /^value$/i],
  withdrawal: [/withdrawal/i, /^debit( amount)?$/i, /^dr$/i, /^paid out$/i],
  deposit: [/deposit/i, /^credit( amount)?$/i, /^cr$/i, /^paid in$/i],
  type: [/^type$/i, /income\/expense/i, /transaction[ _]?type/i, /^dr\/cr$/i, /^debit\/credit$/i],
  category: [/^category$/i, /categor/i],
  subcategory: [/sub[ _-]?category/i],
  account: [/^account( name)?$/i, /^mode$/i, /payment[ _]?(mode|method)/i, /^card$/i],
};

export function detectColumns(headers) {
  const used = new Set();
  const map = {};
  // Subcategory must be claimed before category, which would otherwise match it.
  for (const key of ['subcategory', 'withdrawal', 'deposit', 'type', 'date', 'description', 'amount', 'category', 'account']) {
    for (const pattern of FIELD_PATTERNS[key]) {
      const idx = headers.findIndex((h, i) => !used.has(i) && pattern.test(h.trim()));
      if (idx !== -1) {
        map[key] = idx;
        used.add(idx);
        break;
      }
    }
  }
  return map;
}

const pad = (n) => String(n).padStart(2, '0');

function makeDateParser(samples) {
  // Decide between DD/MM and MM/DD by looking for a first component > 12.
  let dayFirst = false;
  let monthFirst = false;
  for (const s of samples) {
    const m = String(s).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (!m) continue;
    if (Number(m[1]) > 12) dayFirst = true;
    if (Number(m[2]) > 12) monthFirst = true;
  }
  // Ambiguous files (every component <= 12) default to the Indian DD/MM convention.
  const preferDayFirst = dayFirst || !monthFirst;
  return (raw) => {
    const s = String(raw || '').trim();
    let m = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
    if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (m) {
      const year = m[3].length === 2 ? `20${m[3]}` : m[3];
      const [d, mo] = preferDayFirst ? [m[1], m[2]] : [m[2], m[1]];
      if (Number(mo) > 12) return `${year}-${pad(d)}-${pad(mo)}`;
      return `${year}-${pad(mo)}-${pad(d)}`;
    }
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
  };
}

const parseAmount = (raw) => {
  if (raw === undefined || raw === null) return NaN;
  let s = String(raw).trim();
  const negative = /^\(.*\)$/.test(s) || /^-/.test(s) || /\bdr\b/i.test(s);
  s = s.replace(/[^0-9.]/g, '');
  const n = parseFloat(s);
  return Number.isNaN(n) ? NaN : negative ? -n : n;
};

const titleCase = (s) =>
  String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const KEYWORD_CATEGORIES = [
  [/salary|payroll|stipend|bonus/i, 'Salary'],
  [/swiggy|zomato|restaurant|cafe|coffee|food|grocery|bigbasket|blinkit|dmart|starbucks/i, 'Food'],
  [/uber|ola|rapido|metro|fuel|petrol|diesel|irctc|train|bus|flight|indigo/i, 'Transportation'],
  [/rent|landlord|mortgage/i, 'Rent'],
  [/electric|water bill|gas bill|broadband|airtel|jio|vodafone|bsnl|recharge|utility/i, 'Utilities'],
  [/netflix|spotify|prime|hotstar|subscription|youtube/i, 'Subscription'],
  [/amazon|flipkart|myntra|ajio|shopping/i, 'Shopping'],
  [/hospital|pharma|medic|apollo|clinic|doctor/i, 'Health'],
  [/school|college|tuition|course|udemy|coursera/i, 'Education'],
  [/mutual fund|sip|zerodha|groww|stocks?|fd |fixed deposit|ppf|investment/i, 'Investment'],
];

export function guessCategory(description, type) {
  for (const [re, cat] of KEYWORD_CATEGORIES) if (re.test(description)) return cat;
  return type === 'income' ? 'Income' : 'Other';
}

// Money moved into savings or investments is not consumption, so it is tracked as a transfer.
const SAVINGS_CATEGORY = /mutual fund|recurring deposit|fixed deposit|provident fund|\bppf\b|investment|share market|saving bank account|\bsip\b/i;

function classifyType(rawType, amount, category = '') {
  const t = String(rawType || '').toLowerCase();
  if (amount < 0 || /expense|debit|withdraw|transfer/.test(t)) {
    if (SAVINGS_CATEGORY.test(category)) return 'transfer';
  }
  if (/transfer/.test(t)) return 'transfer';
  if (/income|credit|^cr$|deposit|inflow/.test(t)) return 'income';
  if (/expense|debit|^dr$|withdraw|outflow|payment/.test(t)) return 'expense';
  return amount >= 0 ? 'income' : 'expense';
}

/**
 * Turn CSV text into normalised transactions:
 * { date, description, category, subcategory, amount (signed), type, account }
 */
export function normaliseCsv(text, overrides = {}) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { columns: {}, headers: rows[0] || [], transactions: [], errors: ['File has no data rows'] };
  const headers = rows[0].map((h) => h.trim());
  const columns = { ...detectColumns(headers), ...overrides };
  const errors = [];
  if (columns.date === undefined) errors.push('Could not find a date column');
  if (columns.amount === undefined && columns.withdrawal === undefined && columns.deposit === undefined)
    errors.push('Could not find an amount column (or withdrawal/deposit columns)');
  if (errors.length) return { columns, headers, transactions: [], errors };

  const body = rows.slice(1);
  const toDate = makeDateParser(body.slice(0, 200).map((r) => r[columns.date]));
  const transactions = [];
  let skipped = 0;
  body.forEach((r, i) => {
    const date = toDate(r[columns.date]);
    let amount;
    if (columns.amount !== undefined && String(r[columns.amount] ?? '').trim() !== '') {
      amount = parseAmount(r[columns.amount]);
    } else {
      const out = parseAmount(r[columns.withdrawal]) || 0;
      const inn = parseAmount(r[columns.deposit]) || 0;
      amount = inn - Math.abs(out);
    }
    if (!date || Number.isNaN(amount) || amount === 0) {
      skipped++;
      if (errors.length < 5) errors.push(`Row ${i + 2}: missing or invalid date/amount`);
      return;
    }
    const rawType = columns.type !== undefined ? r[columns.type] : '';
    const rawCategory = columns.category !== undefined ? r[columns.category] : '';
    const isIncomeRaw = /income|credit|^cr$|deposit|inflow/i.test(String(rawType)) || (!rawType && amount > 0);
    const type = classifyType(rawType, isIncomeRaw ? Math.abs(amount) : -Math.abs(amount), rawCategory);
    const signed = type === 'income' ? Math.abs(amount) : -Math.abs(amount);
    const subcat = columns.subcategory !== undefined ? titleCase(r[columns.subcategory]) : '';
    const description = (columns.description !== undefined ? r[columns.description] : '')?.trim() || subcat || titleCase(rawCategory) || 'Transaction';
    transactions.push({
      date,
      description,
      category: rawCategory?.trim() ? titleCase(rawCategory) : guessCategory(description, type),
      subcategory: subcat,
      amount: Math.round(signed * 100) / 100,
      type,
      account: columns.account !== undefined ? titleCase(r[columns.account]) || 'Default' : 'Default',
    });
  });
  return { columns, headers, transactions, errors, skipped };
}

/** Validate transactions already structured on the client (e.g. parsed from a PDF statement in the browser). */
export function normaliseRows(rows) {
  const transactions = [];
  const errors = [];
  let skipped = 0;
  (Array.isArray(rows) ? rows.slice(0, 20000) : []).forEach((r, i) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(r?.date || '') ? r.date : null;
    const amount = Number(r?.amount);
    if (!date || !Number.isFinite(amount) || amount === 0) {
      skipped++;
      if (errors.length < 5) errors.push(`Row ${i + 1}: missing or invalid date/amount`);
      return;
    }
    const description = String(r.description || 'Transaction').slice(0, 200);
    const rawCategory = String(r.category || '').slice(0, 60);
    const type = classifyType(r.type, amount, rawCategory);
    transactions.push({
      date, description,
      category: rawCategory ? titleCase(rawCategory) : guessCategory(description, type),
      subcategory: String(r.subcategory || '').slice(0, 60),
      amount: Math.round((type === 'income' ? Math.abs(amount) : -Math.abs(amount)) * 100) / 100,
      type, account: titleCase(String(r.account || 'Default').slice(0, 60)) || 'Default',
    });
  });
  return { columns: {}, headers: [], transactions, errors, skipped };
}

const csvCell = (v) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(txns) {
  const header = ['id', 'date', 'description', 'category', 'subcategory', 'amount', 'type', 'account'];
  return [header.join(','), ...txns.map((t) => header.map((h) => csvCell(t[h])).join(','))].join('\n');
}
