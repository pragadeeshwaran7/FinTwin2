import express from 'express';
import { db, newId } from '../store.js';
import {
  audit, createSession, hashPassword, publicUser, requireAuth, signChallenge, verifyChallenge, verifyPassword,
} from '../auth.js';
import {
  clearFailures, isLocked, newTotpSecret, passwordProblem, rateLimit, recordFailure, totpUri, verifyGoogleIdToken, verifyTotp,
} from '../security.js';
import { config } from '../config.js';

const router = express.Router();
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const authLimiter = rateLimit({ windowMs: 15 * 60e3, max: 30, message: 'Too many sign-in attempts. Try again in 15 minutes.' });
const fail = (res, status, message) => res.status(status).json({ success: false, message });

function issue(req, res, user, method) {
  const { token } = createSession(req, user, method);
  audit(req, user.id, 'login', { method });
  res.json({ success: true, token, user: publicUser(user) });
}

router.get('/config', (_req, res) => res.json({ googleClientId: config.googleClientId || null, demo: { email: config.demoEmail, password: config.demoPassword } }));
router.get('/demo', (_req, res) => res.json({ email: config.demoEmail, password: config.demoPassword }));

router.post('/register', authLimiter, (req, res) => {
  const { name = '', email = '', password = '' } = req.body || {};
  if (!name.trim() || name.length > 80) return fail(res, 400, 'Enter your name (max 80 characters)');
  if (!EMAIL_RE.test(email)) return fail(res, 400, 'Enter a valid email address');
  const problem = passwordProblem(password, email);
  if (problem) return fail(res, 400, problem);
  if (db.findUserByEmail(email)) return fail(res, 409, 'An account with this email already exists');
  const user = db.createUser({ id: newId(), name: name.trim(), email: email.toLowerCase().trim(), password: hashPassword(password), createdAt: new Date().toISOString(), profile: {} });
  audit(req, user.id, 'register', { method: 'password' });
  res.status(201);
  issue(req, res, user, 'password');
});

router.post('/login', authLimiter, (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  const { password = '' } = req.body || {};
  if (isLocked(email)) return fail(res, 423, 'Too many failed attempts. This account is locked for 15 minutes.');
  const user = db.findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password)) {
    const count = recordFailure(email);
    if (user) audit(req, user.id, 'login_failed', { attempt: count });
    return fail(res, 401, 'Incorrect email or password');
  }
  clearFailures(email);
  if (user.totp?.enabled) return res.json({ success: true, twoFactorRequired: true, challenge: signChallenge(user.id) });
  issue(req, res, user, 'password');
});

router.post('/login/2fa', authLimiter, (req, res) => {
  const userId = verifyChallenge(req.body?.challenge);
  const user = userId && db.findUserById(userId);
  if (!user) return fail(res, 401, 'Your sign-in expired. Start again.');
  if (isLocked(user.email)) return fail(res, 423, 'Too many failed attempts. Try again in 15 minutes.');
  if (!verifyTotp(user.totp.secret, req.body?.code)) {
    recordFailure(user.email);
    audit(req, user.id, '2fa_failed');
    return fail(res, 401, 'That code is not valid');
  }
  clearFailures(user.email);
  issue(req, res, user, 'password+2fa');
});

router.post('/google', authLimiter, async (req, res) => {
  try {
    const g = await verifyGoogleIdToken(req.body?.credential);
    let user = db.findUserByGoogleSub(g.sub) || db.findUserByEmail(g.email);
    if (!user) {
      user = db.createUser({ id: newId(), name: g.name || g.email.split('@')[0], email: g.email.toLowerCase(), password: null, googleSub: g.sub, picture: g.picture, createdAt: new Date().toISOString(), profile: {} });
      audit(req, user.id, 'register', { method: 'google' });
    } else if (!user.googleSub) {
      db.updateUser(user.id, { googleSub: g.sub, picture: user.picture || g.picture });
      audit(req, user.id, 'google_linked');
    } else if (user.googleSub !== g.sub) {
      return fail(res, 403, 'This email is linked to a different Google account');
    }
    if (user.totp?.enabled) return res.json({ success: true, twoFactorRequired: true, challenge: signChallenge(user.id) });
    issue(req, res, user, 'google');
  } catch (err) {
    fail(res, 401, err.message);
  }
});

router.use(requireAuth);

router.get('/me', (req, res) => res.json({ success: true, user: publicUser(req.user), session: { id: req.session.id, createdAt: req.session.createdAt } }));

router.patch('/me', (req, res) => {
  const { name, profile } = req.body || {};
  const patch = {};
  if (typeof name === 'string' && name.trim()) patch.name = name.trim().slice(0, 80);
  if (profile && typeof profile === 'object') {
    const allowed = ['age', 'dependents', 'occupation', 'city_tier', 'currency', 'riskProfile', 'goals'];
    patch.profile = { ...req.user.profile, ...Object.fromEntries(Object.entries(profile).filter(([k]) => allowed.includes(k))) };
  }
  res.json({ success: true, user: publicUser(db.updateUser(req.user.id, patch)) });
});

router.post('/logout', (req, res) => {
  db.revokeSessions(req.user.id, (s) => s.id === req.session.id);
  audit(req, req.user.id, 'logout');
  res.json({ success: true });
});

router.get('/sessions', (req, res) => {
  const now = Date.now();
  const list = db.sessions(req.user.id)
    .filter((s) => !s.revokedAt && Date.parse(s.expiresAt) > now)
    .map(({ id, method, createdAt, lastSeenAt, ip, userAgent }) => ({ id, method, createdAt, lastSeenAt, ip, userAgent, current: id === req.session.id }))
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  res.json({ success: true, data: list });
});

router.delete('/sessions/:id', (req, res) => {
  const n = db.revokeSessions(req.user.id, (s) => s.id === req.params.id);
  audit(req, req.user.id, 'session_revoked');
  res.json({ success: true, revoked: n });
});

router.post('/sessions/revoke-others', (req, res) => {
  const n = db.revokeSessions(req.user.id, (s) => s.id !== req.session.id);
  audit(req, req.user.id, 'sessions_revoked', { count: n });
  res.json({ success: true, revoked: n });
});

router.post('/password', (req, res) => {
  const { current = '', next = '' } = req.body || {};
  if (req.user.password && !verifyPassword(current, req.user.password)) return fail(res, 401, 'Current password is incorrect');
  const problem = passwordProblem(next, req.user.email);
  if (problem) return fail(res, 400, problem);
  db.updateUser(req.user.id, { password: hashPassword(next) });
  const revoked = db.revokeSessions(req.user.id, (s) => s.id !== req.session.id);
  audit(req, req.user.id, 'password_changed', { sessionsRevoked: revoked });
  res.json({ success: true, sessionsRevoked: revoked });
});

router.post('/2fa/setup', (req, res) => {
  if (req.user.totp?.enabled) return fail(res, 400, 'Two-factor authentication is already on');
  const secret = newTotpSecret();
  db.updateUser(req.user.id, { totp: { secret, enabled: false } });
  res.json({ success: true, secret, uri: totpUri(secret, req.user.email) });
});

router.post('/2fa/enable', (req, res) => {
  if (!req.user.totp?.secret) return fail(res, 400, 'Start setup first');
  if (!verifyTotp(req.user.totp.secret, req.body?.code)) return fail(res, 400, 'That code is not valid. Check your authenticator app time.');
  db.updateUser(req.user.id, { totp: { ...req.user.totp, enabled: true } });
  audit(req, req.user.id, '2fa_enabled');
  res.json({ success: true, user: publicUser(req.user) });
});

router.post('/2fa/disable', (req, res) => {
  if (!req.user.totp?.enabled) return fail(res, 400, 'Two-factor authentication is not on');
  if (!verifyTotp(req.user.totp.secret, req.body?.code)) return fail(res, 400, 'That code is not valid');
  db.updateUser(req.user.id, { totp: null });
  audit(req, req.user.id, '2fa_disabled');
  res.json({ success: true, user: publicUser(req.user) });
});

router.get('/audit', (req, res) => res.json({ success: true, data: db.audit(req.user.id).slice(0, 50) }));

// Data-protection rights (DPDP Act 2023 / GDPR): export everything, or erase the account.
router.get('/export', (req, res) => {
  audit(req, req.user.id, 'data_exported');
  const { password, totp, ...user } = req.user;
  res.setHeader('Content-Disposition', 'attachment; filename="fintwin-my-data.json"');
  res.json({
    exportedAt: new Date().toISOString(), user,
    transactions: db.transactions(req.user.id), uploads: db.uploads(req.user.id), watchlist: db.watchlist(req.user.id),
    holdings: db.holdings(req.user.id), connections: db.connections(req.user.id).map(({ accessToken, ...c }) => c), securityLog: db.audit(req.user.id),
  });
});

router.delete('/me', (req, res) => {
  if (req.user.email === config.demoEmail) return fail(res, 400, 'The shared demo account cannot be deleted');
  if (req.user.password && !verifyPassword(req.body?.password || '', req.user.password)) return fail(res, 401, 'Password is incorrect');
  db.deleteUser(req.user.id);
  res.json({ success: true });
});

export default router;
