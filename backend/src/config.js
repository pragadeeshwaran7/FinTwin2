import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_ROOT = path.resolve(__dirname, '..');
export const PROJECT_ROOT = path.resolve(BACKEND_ROOT, '..');

dotenv.config({ path: path.join(BACKEND_ROOT, '.env') });

const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5001),
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`,
  allowedOrigins: list(process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5001'),
  dataFile: process.env.DATA_FILE || path.join(BACKEND_ROOT, 'data', 'store.json'),
  dataKey: process.env.DATA_ENCRYPTION_KEY || '',
  tokenSecret: process.env.TOKEN_SECRET || '',
  sessionIdleHours: Number(process.env.SESSION_IDLE_HOURS || 24),
  sessionMaxDays: Number(process.env.SESSION_MAX_DAYS || 14),
  pythonPath: process.env.PYTHON_PATH || 'python3',
  mlDir: path.join(PROJECT_ROOT, 'ml'),
  householdCsv: path.join(PROJECT_ROOT, 'ml', 'data', 'household_transactions.csv'),
  frontendDist: path.join(PROJECT_ROOT, 'frontend', 'dist'),
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  geminiUrl:
    process.env.GEMINI_URL ||
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  kite: { apiKey: process.env.KITE_API_KEY || '', apiSecret: process.env.KITE_API_SECRET || '' },
  demoEmail: 'demo@fintwin.app',
  demoPassword: 'demo1234',
};
