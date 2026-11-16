import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { ensureDemoUser } from './seed.js';
import { corsOptions, rateLimit, securityHeaders } from './security.js';
import { ensureRiskModel } from './services/ml.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import marketRoutes from './routes/markets.js';
import mlRoutes from './routes/ml.js';
import chatRoutes from './routes/chat.js';
import portfolioRoutes from './routes/portfolio.js';
import twinRoutes from './routes/twin.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProd) app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(cors(corsOptions()));
  app.use('/api', rateLimit({ windowMs: 60e3, max: 600, message: 'Too many requests from this address' }));
  app.use(express.json({ limit: '15mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan(config.isProd ? 'combined' : 'dev', { skip: (req) => req.path === '/api/health' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/markets', marketRoutes);
  app.use('/api/ml', mlRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/portfolio', portfolioRoutes);
  app.use('/api/twin', twinRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'Not found' }));

  // Serve the built frontend (npm run build in frontend/) from the same origin.
  if (fs.existsSync(config.frontendDist)) {
    app.use(express.static(config.frontendDist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(config.frontendDist, 'index.html')));
  }

  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error('Error:', err.message);
    // Never leak internals in production.
    res.status(status).json({ success: false, message: status >= 500 && config.isProd ? 'Server error' : err.type === 'entity.parse.failed' ? 'Malformed JSON' : err.message });
  });
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  ensureDemoUser();
  createApp().listen(config.port, () => {
    console.log(`FinTwin API running on http://localhost:${config.port}`);
    console.log(`Demo login: ${config.demoEmail} / ${config.demoPassword}`);
    console.log(`AI assistant: ${config.openrouterApiKey ? `OpenRouter (${config.openrouterModel})` : config.geminiApiKey ? 'Gemini' : 'rule-based (set GEMINI_API_KEY for LLM answers)'}`);
    console.log(`Google sign-in: ${config.googleClientId ? 'enabled' : 'disabled (set GOOGLE_CLIENT_ID)'}`);
    if (!config.dataKey) console.warn('DATA_ENCRYPTION_KEY not set: using an auto-generated key in data/.master.key (set it explicitly in production).');
    ensureRiskModel().catch(() => {});
  });
}
