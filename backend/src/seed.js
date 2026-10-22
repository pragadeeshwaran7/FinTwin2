// Seeds the demo account with the Indian "Daily Household Transactions" dataset
// (ml/data/household_transactions.csv, 2015-2018). Dates are shifted so the
// newest transaction falls on yesterday, keeping date-range views meaningful.
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { db, newId, save } from './store.js';
import { hashPassword } from './auth.js';
import { normaliseCsv } from './services/csv.js';

export function sampleTransactions() {
  const { transactions } = normaliseCsv(fs.readFileSync(config.householdCsv, 'utf8'));
  const newest = transactions.reduce((m, t) => (t.date > m ? t.date : m), '');
  const yesterday = new Date(Date.now() - 86400e3).toISOString().slice(0, 10);
  const shift = Date.parse(yesterday) - Date.parse(newest);
  return transactions.map((t) => ({
    ...t,
    id: newId(),
    date: new Date(Date.parse(t.date) + shift).toISOString().slice(0, 10),
    source: 'sample',
  }));
}

export function ensureDemoUser({ reset = false } = {}) {
  let user = db.findUserByEmail(config.demoEmail);
  if (!user) {
    user = db.createUser({
      id: newId(),
      name: 'Demo User',
      email: config.demoEmail,
      password: hashPassword(config.demoPassword),
      createdAt: new Date().toISOString(),
      profile: { age: 32, dependents: 1, occupation: 'Professional', city_tier: 'Tier_1' },
    });
    reset = true;
  }
  if (reset || db.transactions(user.id).length === 0) {
    db.setTransactions(user.id, sampleTransactions());
    db.uploads(user.id).length = 0;
    db.addUpload(user.id, { id: newId(), filename: 'household_transactions.csv', rows: db.transactions(user.id).length, status: 'completed', uploadedAt: new Date().toISOString(), source: 'sample' });
    save();
  }
  return user;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const user = ensureDemoUser({ reset: process.argv.includes('--reset') });
  console.log(`Demo user ready: ${config.demoEmail} / ${config.demoPassword} (${db.transactions(user.id).length} transactions)`);
}
