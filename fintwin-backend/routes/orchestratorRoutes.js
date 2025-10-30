import express from 'express';
import { queryOrchestrator } from '../controllers/orchestratorController.js';

const router = express.Router();

// POST /api/orchestrator/query
router.post('/query', queryOrchestrator);

export default router;
