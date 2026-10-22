import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.NODE_ENV = 'test';
process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fintwin-')), 'store.json');
process.env.GEMINI_API_KEY = '';

const { normaliseCsv, parseCsv, toCsv } = await import('../src/services/csv.js');
const finance = await import('../src/services/finance.js');
const { createApp } = await import('../src/server.js');
const { ensureDemoUser } = await import('../src/seed.js');

test('parseCsv handles quotes, escaped quotes and CRLF', () => {
  const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'say "hi"']]);
});

test('normaliseCsv: signed amount column with inferred categories', () => {
  const { transactions, errors } = normaliseCsv('Date,Description,Amount\n2026-10-01,Salary credit,85000\n2026-10-02,Swiggy order,-420\n');
  assert.equal(errors.length, 0);
  assert.deepEqual(transactions.map((t) => [t.type, t.amount, t.category]), [['income', 85000, 'Salary'], ['expense', -420, 'Food']]);
});

test('normaliseCsv: withdrawal/deposit bank statement and DD/MM dates', () => {
  const csv = 'Txn Date,Narration,Withdrawal,Deposit\n25/09/2026,UPI-ZOMATO,350,\n26/09/2026,NEFT SALARY,,50000\n';
  const { transactions } = normaliseCsv(csv);
  assert.equal(transactions[0].date, '2026-09-25');
  assert.equal(transactions[0].amount, -350);
  assert.equal(transactions[1].type, 'income');
});

test('normaliseCsv: household format, MM/DD dates, investments become transfers', () => {
  const csv = 'Date,Mode,Category,Subcategory,Note,Amount,Income/Expense,Currency\n09/20/2018,Cash,Food,snacks,Vada,60,Expense,INR\n09/19/2018,Saving Bank account 1,Equity Mutual Fund A,,SIP,5000,Expense,INR\n';
  const { transactions } = normaliseCsv(csv);
  assert.equal(transactions[0].date, '2018-09-20');
  assert.equal(transactions[0].account, 'Cash');
  assert.equal(transactions[1].type, 'transfer');
});

test('normaliseCsv reports missing columns', () => {
  const { errors } = normaliseCsv('Foo,Bar\n1,2\n');
  assert.ok(errors.some((e) => /date/i.test(e)));
});

test('toCsv round-trips through the importer', () => {
  const rows = [{ id: '1', date: '2026-01-05', description: 'Rent, Jan', category: 'Rent', subcategory: '', amount: -15000, type: 'expense', account: 'HDFC' }];
  const back = normaliseCsv(toCsv(rows)).transactions[0];
  assert.equal(back.description, 'Rent, Jan');
  assert.equal(back.amount, -15000);
});

test('finance.dashboard computes metrics, comparisons and categories', () => {
  const txns = [
    { date: '2026-10-20', description: 'Salary', category: 'Salary', amount: 100000, type: 'income', account: 'A' },
    { date: '2026-10-10', description: 'Rent', category: 'Rent', amount: -30000, type: 'expense', account: 'A' },
    { date: '2026-10-11', description: 'Groceries', category: 'Food', amount: -10000, type: 'expense', account: 'A' },
    { date: '2026-10-12', description: 'SIP', category: 'Investment', amount: -20000, type: 'transfer', account: 'A' },
    { date: '2026-09-15', description: 'Salary', category: 'Salary', amount: 100000, type: 'income', account: 'A' },
    { date: '2026-09-16', description: 'Rent', category: 'Rent', amount: -30000, type: 'expense', account: 'A' },
  ];
  const d = finance.dashboard(txns, { range: '30d' });
  assert.equal(d.range.to, '2026-10-20');
  assert.equal(d.metrics.totalIncome, 100000);
  assert.equal(d.metrics.totalExpenses, 40000);
  assert.equal(d.metrics.savingsRate, 60);
  assert.equal(d.categories[0].category, 'Rent');
  assert.equal(d.spending.length, 30);
  assert.equal(d.changes.totalExpenses, 33.3);
});

test('API: auth, dashboard, import preview/commit and CRUD', async () => {
  ensureDemoUser();
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    assert.equal((await call('/transactions')).status, 401);
    assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'demo@fintwin.app', password: 'wrong' } })).status, 401);

    const reg = await call('/auth/register', { method: 'POST', body: { name: 'Test', email: 'test@example.com', password: 'Twin-Secure-2026' } });
    assert.equal(reg.status, 201);
    const token = reg.body.token;
    assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'Test', email: 'test@example.com', password: 'Twin-Secure-2026' } })).status, 409);
    assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'Weak', email: 'weak@example.com', password: 'password123' } })).status, 400);

    const content = 'Date,Description,Amount\n2026-10-01,Salary,50000\n2026-10-02,Swiggy,-500\n';
    const preview = await call('/transactions/import', { method: 'POST', token, body: { filename: 't.csv', content } });
    assert.equal(preview.body.newCount, 2);
    const commit = await call('/transactions/import', { method: 'POST', token, body: { filename: 't.csv', content, commit: true } });
    assert.equal(commit.body.imported, 2);
    const again = await call('/transactions/import', { method: 'POST', token, body: { filename: 't.csv', content } });
    assert.equal(again.body.duplicates, 2);

    const added = await call('/transactions', { method: 'POST', token, body: { date: '2026-10-03', description: 'Metro', category: 'Transportation', amount: 60, type: 'expense' } });
    assert.equal(added.body.data.amount, -60);
    const edited = await call(`/transactions/${added.body.data.id}`, { method: 'PUT', token, body: { amount: 80 } });
    assert.equal(edited.body.data.amount, -80);

    const dash = await call('/transactions/dashboard?range=30d', { token });
    assert.equal(dash.body.data.metrics.totalIncome, 50000);
    assert.equal(dash.body.data.metrics.totalExpenses, 580);

    const list = await call('/transactions?search=swiggy', { token });
    assert.equal(list.body.total, 1);
    assert.equal((await call(`/transactions/${added.body.data.id}`, { method: 'DELETE', token })).status, 200);

    const uploads = await call('/transactions/uploads', { token });
    const removed = await call(`/transactions/uploads/${uploads.body.data[0].id}`, { method: 'DELETE', token });
    assert.equal(removed.body.removed, 2);

    const demo = await call('/auth/login', { method: 'POST', body: { email: 'demo@fintwin.app', password: 'demo1234' } });
    const demoDash = await call('/transactions/meta', { token: demo.body.token });
    assert.ok(demoDash.body.count > 2000);
  } finally {
    server.close();
  }
});

test('security: sessions are per user, revocable, lockout and 2FA work, data encrypted at rest', async () => {
  const { totpCode } = await import('../src/security.js');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (p, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  };
  try {
    const a = (await call('/auth/register', { method: 'POST', body: { name: 'Alice', email: 'alice@example.com', password: 'Garden-Pass-77' } })).body.token;
    const b = (await call('/auth/register', { method: 'POST', body: { name: 'Bob', email: 'bob@example.com', password: 'River-Pass-88' } })).body.token;
    await call('/transactions', { method: 'POST', token: a, body: { date: '2026-10-01', description: 'Alice only', amount: 100, type: 'expense' } });
    assert.equal((await call('/transactions', { token: b })).body.total, 0, 'Bob must not see Alice data');
    assert.equal((await call('/transactions', { token: a })).body.total, 1);

    // second session for Alice, then logout of the first revokes only that one
    const a2 = (await call('/auth/login', { method: 'POST', body: { email: 'alice@example.com', password: 'Garden-Pass-77' } })).body.token;
    assert.equal((await call('/auth/sessions', { token: a2 })).body.data.length, 2);
    await call('/auth/logout', { method: 'POST', token: a });
    assert.equal((await call('/auth/me', { token: a })).status, 401);
    assert.equal((await call('/auth/me', { token: a2 })).status, 200);

    // security headers
    const h = (await call('/health')).headers;
    assert.match(h.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(h.get('x-frame-options'), 'DENY');

    // 2FA
    const setup = (await call('/auth/2fa/setup', { method: 'POST', token: a2 })).body;
    const code = () => totpCode(setup.secret, Math.floor(Date.now() / 30000));
    assert.equal((await call('/auth/2fa/enable', { method: 'POST', token: a2, body: { code: code() } })).status, 200);
    const step1 = (await call('/auth/login', { method: 'POST', body: { email: 'alice@example.com', password: 'Garden-Pass-77' } })).body;
    assert.equal(step1.twoFactorRequired, true);
    assert.equal(step1.token, undefined);
    assert.equal((await call('/auth/login/2fa', { method: 'POST', body: { challenge: step1.challenge, code: '000000' } })).status, 401);
    assert.equal((await call('/auth/login/2fa', { method: 'POST', body: { challenge: step1.challenge, code: code() } })).status, 200);

    // lockout after 5 bad passwords
    for (let i = 0; i < 5; i++) await call('/auth/login', { method: 'POST', body: { email: 'bob@example.com', password: 'wrong-1' } });
    assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'bob@example.com', password: 'River-Pass-88' } })).status, 423);

    // the store on disk is ciphertext
    const raw = fs.readFileSync(process.env.DATA_FILE, 'utf8');
    assert.match(raw, /"enc":"aes-256-gcm"/);
    assert.ok(!raw.includes('alice@example.com'));
  } finally {
    server.close();
  }
});
