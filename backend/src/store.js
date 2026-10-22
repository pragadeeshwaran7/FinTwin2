// JSON-file datastore, encrypted at rest with AES-256-GCM. All reads are served
// from memory; every mutation re-encrypts and atomically rewrites the file.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config.js';

const EMPTY = { version: 2, secret: '', users: [], transactions: {}, uploads: {}, sessions: [], audit: {}, watchlists: {}, holdings: {}, connections: {} };
let state = null;
let key = null;

function encryptionKey() {
  if (key) return key;
  if (config.dataKey) {
    key = Buffer.from(config.dataKey, 'hex');
  } else {
    // No key configured: generate one next to the data file (0600). Set DATA_ENCRYPTION_KEY in production.
    const keyFile = path.join(path.dirname(config.dataFile), '.master.key');
    fs.mkdirSync(path.dirname(keyFile), { recursive: true });
    if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
    key = Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'hex');
  }
  if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  return key;
}

function decrypt(raw) {
  const parsed = JSON.parse(raw);
  if (parsed.enc !== 'aes-256-gcm') return parsed; // legacy plaintext store: re-encrypted on next save
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]).toString('utf8'));
}

function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return JSON.stringify({ enc: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') });
}

function load() {
  if (state) return state;
  let raw = null;
  try {
    raw = fs.readFileSync(config.dataFile, 'utf8');
  } catch {
    /* first run */
  }
  state = raw ? { ...structuredClone(EMPTY), ...decrypt(raw) } : structuredClone(EMPTY);
  if (!state.secret) state.secret = crypto.randomBytes(32).toString('hex');
  save();
  return state;
}

export function save() {
  fs.mkdirSync(path.dirname(config.dataFile), { recursive: true });
  const tmp = `${config.dataFile}.tmp`;
  fs.writeFileSync(tmp, encrypt(state), { mode: 0o600 });
  fs.renameSync(tmp, config.dataFile);
}

export const newId = () => crypto.randomUUID();

export const db = {
  get secret() {
    return load().secret;
  },
  findUserByEmail(email) {
    return load().users.find((u) => u.email === String(email).toLowerCase().trim());
  },
  findUserByGoogleSub(sub) {
    return load().users.find((u) => u.googleSub === sub);
  },
  findUserById(id) {
    return load().users.find((u) => u.id === id);
  },
  createUser(user) {
    const s = load();
    s.users.push(user);
    s.transactions[user.id] = [];
    s.uploads[user.id] = [];
    save();
    return user;
  },
  updateUser(id, patch) {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, patch);
    save();
    return user;
  },
  deleteUser(id) {
    const s = load();
    s.users = s.users.filter((u) => u.id !== id);
    s.sessions = s.sessions.filter((x) => x.userId !== id);
    for (const coll of ['transactions', 'uploads', 'audit', 'watchlists', 'holdings', 'connections']) delete s[coll][id];
    save();
  },
  transactions(userId) {
    return (load().transactions[userId] ||= []);
  },
  setTransactions(userId, txns) {
    load().transactions[userId] = txns;
    save();
  },
  uploads(userId) {
    return (load().uploads[userId] ||= []);
  },
  addUpload(userId, record) {
    this.uploads(userId).unshift(record);
    save();
  },

  // Sessions: one per login, individually revocable.
  createSession(session) {
    const s = load();
    s.sessions.push(session);
    // Keep the newest 20 sessions per user.
    const mine = s.sessions.filter((x) => x.userId === session.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const drop = new Set(mine.slice(20).map((x) => x.id));
    s.sessions = s.sessions.filter((x) => !drop.has(x.id));
    save();
    return session;
  },
  findSession(id) {
    return load().sessions.find((x) => x.id === id);
  },
  sessions(userId) {
    return load().sessions.filter((x) => x.userId === userId);
  },
  touchSession(session) {
    session.lastSeenAt = new Date().toISOString();
    save();
  },
  revokeSessions(userId, predicate = () => true) {
    let n = 0;
    for (const x of load().sessions) {
      if (x.userId === userId && !x.revokedAt && predicate(x)) {
        x.revokedAt = new Date().toISOString();
        n++;
      }
    }
    save();
    return n;
  },

  audit(userId) {
    return (load().audit[userId] ||= []);
  },
  addAudit(userId, entry) {
    const list = this.audit(userId);
    list.unshift(entry);
    list.length = Math.min(list.length, 200);
    save();
  },

  watchlist(userId) {
    return (load().watchlists[userId] ||= ['^NSEI', 'RELIANCE.NS', 'AAPL', 'VOD.L']);
  },
  setWatchlist(userId, list) {
    load().watchlists[userId] = list;
    save();
  },
  holdings(userId) {
    return (load().holdings[userId] ||= []);
  },
  setHoldings(userId, list) {
    load().holdings[userId] = list;
    save();
  },
  connections(userId) {
    return (load().connections[userId] ||= []);
  },
  setConnections(userId, list) {
    load().connections[userId] = list;
    save();
  },
};
