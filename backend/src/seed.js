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

// Permanent accounts, re-created on every start (the free host wipes stored data on restart).
// Only scrypt hashes are stored here. Extra accounts: SEED_USERS="email:password,email2:password2".
const PERMANENT_USERS = [
  { email: 'harsha@gmail.com', name: 'Harsha', passwordHash: '7c50685914b245325f59b3c065248f8f:1860f01fbe01a9c87ae081d56b252f31e3838c0cb49d8e48e2fc0820add5768c7922cd5552f4d334602fcecbb9579ce5dd9728607e953c5525033b0b30f3027f' },
  { email: 'vedhanthdevadharshan@gmail.com', name: 'Vedhanth', passwordHash: '5665e3ed8a1955c6acac8bf1b93e8a23:b385b0f75045c56e355e1c45d73a03b56cee2cf89799e171d7bee3c083694118df0a797780c59f0d371de1a1d0e7e04036ce949570965eb88bc7137159d036d8' },
];

export function ensurePermanentUsers() {
  const extra = (process.env.SEED_USERS || '').split(',').map((s) => s.trim()).filter(Boolean).map((pair) => {
    const i = pair.indexOf(':');
    return { email: pair.slice(0, i).trim().toLowerCase(), name: pair.slice(0, i).split('@')[0], passwordHash: hashPassword(pair.slice(i + 1)) };
  }).filter((u) => u.email.includes('@'));
  let changed = false;
  for (const u of [...PERMANENT_USERS, ...extra]) {
    if (db.findUserByEmail(u.email)) continue;
    db.createUser({ id: newId(), name: u.name, email: u.email, password: u.passwordHash, createdAt: new Date().toISOString(), profile: {} });
    changed = true;
  }
  if (changed) save();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const user = ensureDemoUser({ reset: process.argv.includes('--reset') });
  console.log(`Demo user ready: ${config.demoEmail} / ${config.demoPassword} (${db.transactions(user.id).length} transactions)`);
}
