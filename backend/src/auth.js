// Passwords (scrypt), server-side sessions and the auth middleware.
// A token is "<sessionId>.<hmac>"; the session record decides whether it is valid,
// so logout and "sign out everywhere" take effect immediately.
import crypto from 'crypto';
import { config } from './config.js';
import { db, newId } from './store.js';

const secret = () => config.tokenSecret || db.secret;
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('base64url');

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

const clientInfo = (req) => ({
  ip: (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim(),
  userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
});

export function audit(req, userId, event, detail = {}) {
  db.addAudit(userId, { at: new Date().toISOString(), event, ...clientInfo(req), ...detail });
}

export function createSession(req, user, method) {
  const now = new Date();
  const session = {
    id: crypto.randomBytes(24).toString('base64url'),
    userId: user.id,
    method,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + config.sessionMaxDays * 86400e3).toISOString(),
    ...clientInfo(req),
  };
  db.createSession(session);
  return { token: `${session.id}.${sign(session.id)}`, session };
}

/** Short-lived signed challenge used between password check and 2FA code. */
export function signChallenge(userId) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + 5 * 60e3, n: newId() })).toString('base64url');
  return `${payload}.${sign(`2fa:${payload}`)}`;
}
export function verifyChallenge(token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = sign(`2fa:${payload}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  return data.exp > Date.now() ? data.sub : null;
}

export function resolveSession(token) {
  const [id, sig] = String(token || '').split('.');
  if (!id || !sig) return null;
  const expected = sign(id);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const session = db.findSession(id);
  if (!session || session.revokedAt) return null;
  const now = Date.now();
  if (Date.parse(session.expiresAt) < now) return null;
  if (now - Date.parse(session.lastSeenAt) > config.sessionIdleHours * 3600e3) return null;
  return session;
}

export const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, profile: u.profile || {},
  picture: u.picture || null, twoFactor: Boolean(u.totp?.enabled), hasPassword: Boolean(u.password), google: Boolean(u.googleSub),
});

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const session = resolveSession(header.startsWith('Bearer ') ? header.slice(7) : null);
  const user = session && db.findUserById(session.userId);
  if (!user) return res.status(401).json({ success: false, message: 'Your session has ended. Please sign in again.' });
  // Persist activity at most every 5 minutes to avoid rewriting the store on every request.
  if (Date.now() - Date.parse(session.lastSeenAt) > 5 * 60e3) db.touchSession(session);
  req.user = user;
  req.session = session;
  next();
}
