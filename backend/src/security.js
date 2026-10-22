// Security middleware: HTTP headers, CORS allow-list, rate limiting and login lockout.
import crypto from 'crypto';
import { config } from './config.js';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com/gsi/client https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  // Client-side RAG downloads its embedding model from Hugging Face (and ONNX runtime from jsDelivr).
  "connect-src 'self' https://accounts.google.com/gsi/ https://huggingface.co https://*.huggingface.co https://*.hf.co https://cdn.jsdelivr.net",
  "frame-src https://accounts.google.com/gsi/",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  if (config.isProd) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  res.removeHeader('X-Powered-By');
  next();
}

export function corsOptions() {
  return {
    origin: (origin, cb) => cb(null, !origin || config.allowedOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  };
}

/** Fixed-window in-memory rate limiter. key(req) picks the bucket (IP, user, email…). */
export function rateLimit({ windowMs, max, key = (req) => req.ip, message = 'Too many requests, please slow down' }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    let entry = hits.get(k);
    if (!entry || entry.reset < now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(k, entry);
    }
    entry.count++;
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - entry.count));
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ success: false, message });
    }
    next();
  };
}

// Account lockout: 5 failed logins per email within 15 minutes locks that email for 15 minutes.
const failures = new Map();
const LOCK_WINDOW = 15 * 60e3;
const MAX_FAILURES = 5;

export function isLocked(email) {
  const f = failures.get(email);
  return Boolean(f && f.lockedUntil && f.lockedUntil > Date.now());
}
export function recordFailure(email) {
  const now = Date.now();
  const f = failures.get(email) || { count: 0, first: now };
  if (now - f.first > LOCK_WINDOW) Object.assign(f, { count: 0, first: now });
  f.count++;
  if (f.count >= MAX_FAILURES) f.lockedUntil = now + LOCK_WINDOW;
  failures.set(email, f);
  return f.count;
}
export const clearFailures = (email) => failures.delete(email);

const COMMON_PASSWORDS = new Set(['password', 'password1', 'password123', '12345678', '123456789', 'qwerty123', 'iloveyou', 'admin123', 'welcome1', 'letmein1', 'abc12345', 'fintwin123']);
export function passwordProblem(password, email = '') {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password is too long';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain letters and numbers';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'This password is too common';
  if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase())) return 'Password must not contain your email name';
  return null;
}

// ---- TOTP (RFC 6238) for two-factor authentication ----
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotpSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  return bits.match(/.{1,5}/g).map((c) => B32[parseInt(c.padEnd(5, '0'), 2)]).join('');
}
function base32Decode(s) {
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  return Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
}
export function totpCode(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(off) & 0x7fffffff) % 1e6).padStart(6, '0');
}
export function verifyTotp(secret, code) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  const step = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some((d) => crypto.timingSafeEqual(Buffer.from(totpCode(secret, step + d)), Buffer.from(c)));
}
export const totpUri = (secret, email) => `otpauth://totp/FinTwin:${encodeURIComponent(email)}?secret=${secret}&issuer=FinTwin&digits=6&period=30`;

// ---- Google Sign-In: verify an ID token against Google's JWKS ----
let jwks = { keys: [], expires: 0 };
async function googleKeys() {
  if (jwks.expires > Date.now()) return jwks.keys;
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs', { signal: AbortSignal.timeout(8000) });
  const body = await res.json();
  const maxAge = Number((res.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1] || 3600);
  jwks = { keys: body.keys, expires: Date.now() + maxAge * 1000 };
  return jwks.keys;
}

export async function verifyGoogleIdToken(idToken) {
  if (!config.googleClientId) throw new Error('Google sign-in is not configured (GOOGLE_CLIENT_ID)');
  const [h, p, s] = String(idToken || '').split('.');
  if (!s) throw new Error('Malformed Google token');
  const header = JSON.parse(Buffer.from(h, 'base64url').toString());
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  if (header.alg !== 'RS256') throw new Error('Unexpected token algorithm');
  const jwk = (await googleKeys()).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('Unknown Google signing key');
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), crypto.createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(s, 'base64url'));
  if (!ok) throw new Error('Invalid Google token signature');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) throw new Error('Invalid token issuer');
  if (payload.aud !== config.googleClientId) throw new Error('Token was issued for another app');
  if (payload.exp * 1000 < Date.now()) throw new Error('Google token expired');
  if (!payload.email_verified) throw new Error('Google email is not verified');
  return payload;
}
