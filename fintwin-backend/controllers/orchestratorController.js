import { callExternalLLM } from '../services/orchestratorService.js';

export const queryOrchestrator = async (req, res, next) => {
  try {
    const payload = req.body || {};

    // Validate environment config early and return a friendly 400 instead of throwing
    const apiKey = process.env.GEMINI_API_KEY;
    const url = process.env.GEMINI_URL;
    if (!apiKey || !url) {
      return res.status(400).json({ success: false, message: 'GEMINI_API_KEY and GEMINI_URL must be set in environment to use the orchestrator' });
    }

    // payload is expected to have shape { user_id, intent, payload }
    console.log('Orchestrator Controller - Received payload:', JSON.stringify(payload, null, 2));
    
    const result = await callExternalLLM(payload);
    console.log('Orchestrator Controller - Response received:', JSON.stringify(result, null, 2));
    
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
