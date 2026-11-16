import express from 'express';
import { requireAuth } from '../auth.js';
import { ask } from '../services/assistant.js';
import { config } from '../config.js';
import { rateLimit } from '../security.js';

const router = express.Router();
router.use(requireAuth);
router.use(rateLimit({ windowMs: 60e3, max: 20, key: (req) => `chat:${req.user.id}`, message: 'You are sending messages too quickly. Wait a moment.' }));

router.get('/status', (_req, res) => res.json({ success: true, llm: config.geminiApiKey || config.openrouterApiKey ? 'gemini' : 'rules' }));

router.post('/', async (req, res, next) => {
  const { message = '', history = [], context = {} } = req.body || {};
  if (!message.trim()) return res.status(400).json({ success: false, message: 'Message is empty' });
  try {
    const answer = await ask(req.user, message.trim().slice(0, 2000), Array.isArray(history) ? history.slice(-8) : [], context && typeof context === 'object' ? context : {});
    res.json({ success: true, data: answer });
  } catch (err) {
    next(err);
  }
});

export default router;
