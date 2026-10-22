import express from 'express';
import { db, newId, save } from '../store.js';
import { requireAuth } from '../auth.js';
import * as finance from '../services/finance.js';
import { normaliseCsv, normaliseRows, toCsv } from '../services/csv.js';
import { sampleTransactions } from '../seed.js';

const router = express.Router();
router.use(requireAuth);

const TYPES = ['income', 'expense', 'transfer'];

function validate(body) {
  const { date, description, category, amount, type = 'expense', account = 'Default', subcategory = '' } = body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { error: 'Date must be YYYY-MM-DD' };
  const value = Number(amount);
  if (!Number.isFinite(value) || value === 0) return { error: 'Amount must be a non-zero number' };
  if (!TYPES.includes(type)) return { error: `Type must be one of ${TYPES.join(', ')}` };
  return {
    txn: {
      date,
      description: String(description || 'Transaction').slice(0, 200),
      category: String(category || 'Other').slice(0, 60),
      subcategory: String(subcategory).slice(0, 60),
      amount: type === 'income' ? Math.abs(value) : -Math.abs(value),
      type,
      account: String(account || 'Default').slice(0, 60),
    },
  };
}

router.get('/', (req, res) => {
  const all = db.transactions(req.user.id);
  const { page = 1, pageSize = 25, sortBy = 'date', sortDir = 'desc', range } = req.query;
  const window = range ? finance.resolveRange(all, range) : {};
  const filtered = finance.filterTransactions(all, { ...window, ...req.query, from: req.query.from || window.from, to: req.query.to || window.to });
  const sorted = finance.sortTransactions(filtered, sortBy, sortDir);
  const size = Math.min(200, Math.max(1, Number(pageSize)));
  const p = Math.max(1, Number(page));
  res.json({
    success: true,
    data: sorted.slice((p - 1) * size, p * size),
    total: sorted.length,
    page: p,
    pageSize: size,
    totals: finance.metrics(filtered),
  });
});

router.get('/meta', (req, res) => {
  const all = db.transactions(req.user.id);
  const dates = all.map((t) => t.date).sort();
  res.json({
    success: true,
    categories: [...new Set(all.map((t) => t.category))].sort(),
    accounts: [...new Set(all.map((t) => t.account))].sort(),
    count: all.length,
    firstDate: dates[0] || null,
    lastDate: dates.at(-1) || null,
  });
});

router.get('/dashboard', (req, res) => {
  const { range = '30d', from, to } = req.query;
  res.json({ success: true, data: finance.dashboard(db.transactions(req.user.id), { range, from, to }) });
});

router.get('/export', (req, res) => {
  const all = db.transactions(req.user.id);
  const window = req.query.range ? finance.resolveRange(all, req.query.range) : {};
  const rows = finance.sortTransactions(finance.filterTransactions(all, { ...req.query, ...window }), 'date', 'desc');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="fintwin-transactions-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(toCsv(rows));
});

router.get('/uploads', (req, res) => res.json({ success: true, data: db.uploads(req.user.id) }));

router.post('/import', (req, res) => {
  const { filename = 'upload.csv', content = '', rows, commit = false, columns } = req.body || {};
  if (!rows && !content.trim()) return res.status(400).json({ success: false, message: 'File is empty' });
  const parsed = rows ? normaliseRows(rows) : normaliseCsv(content, columns || {});
  const existing = db.transactions(req.user.id);
  const seen = new Set(existing.map((t) => `${t.date}|${t.amount}|${t.description.toLowerCase()}`));
  const fresh = parsed.transactions.filter((t) => !seen.has(`${t.date}|${t.amount}|${t.description.toLowerCase()}`));
  const duplicates = parsed.transactions.length - fresh.length;
  if (!commit) {
    return res.json({
      success: parsed.transactions.length > 0,
      preview: parsed.transactions.slice(0, 15),
      headers: parsed.headers,
      columns: parsed.columns,
      total: parsed.transactions.length,
      newCount: fresh.length,
      duplicates,
      skipped: parsed.skipped || 0,
      errors: parsed.errors,
      summary: finance.metrics(parsed.transactions),
    });
  }
  if (!fresh.length) return res.status(400).json({ success: false, message: parsed.errors[0] || 'No new transactions to import', duplicates });
  const uploadId = newId();
  existing.push(...fresh.map((t) => ({ ...t, id: newId(), source: uploadId })));
  const record = { id: uploadId, filename, rows: fresh.length, duplicates, skipped: parsed.skipped || 0, status: 'completed', uploadedAt: new Date().toISOString() };
  db.addUpload(req.user.id, record);
  res.json({ success: true, imported: fresh.length, duplicates, upload: record });
});

router.post('/sample', (req, res) => {
  const existing = db.transactions(req.user.id).filter((t) => t.source !== 'sample');
  const sample = sampleTransactions();
  db.setTransactions(req.user.id, [...existing, ...sample]);
  db.addUpload(req.user.id, { id: newId(), filename: 'household_transactions.csv (sample)', rows: sample.length, status: 'completed', uploadedAt: new Date().toISOString(), source: 'sample' });
  res.json({ success: true, imported: sample.length });
});

router.delete('/uploads/:id', (req, res) => {
  const uploads = db.uploads(req.user.id);
  const record = uploads.find((u) => u.id === req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Upload not found' });
  const source = record.source === 'sample' ? 'sample' : record.id;
  const remaining = db.transactions(req.user.id).filter((t) => t.source !== source);
  const removed = db.transactions(req.user.id).length - remaining.length;
  db.setTransactions(req.user.id, remaining);
  uploads.splice(uploads.indexOf(record), 1);
  save();
  res.json({ success: true, removed });
});

router.post('/', (req, res) => {
  const { txn, error } = validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const record = { ...txn, id: newId(), source: 'manual' };
  db.transactions(req.user.id).push(record);
  save();
  res.status(201).json({ success: true, data: record });
});

router.put('/:id', (req, res) => {
  const list = db.transactions(req.user.id);
  const idx = list.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Transaction not found' });
  const { txn, error } = validate({ ...list[idx], ...req.body, amount: req.body.amount ?? Math.abs(list[idx].amount) });
  if (error) return res.status(400).json({ success: false, message: error });
  list[idx] = { ...list[idx], ...txn };
  save();
  res.json({ success: true, data: list[idx] });
});

router.delete('/:id', (req, res) => {
  const list = db.transactions(req.user.id);
  const idx = list.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Transaction not found' });
  list.splice(idx, 1);
  save();
  res.json({ success: true });
});

export default router;
