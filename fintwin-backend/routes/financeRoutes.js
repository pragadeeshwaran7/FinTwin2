import express from 'express';
import { getAndStorePrice, getHistory, getHistoricalData } from '../controllers/financeController.js';

const router = express.Router();

router.get('/price/:ticker', getAndStorePrice);
router.get('/history/:ticker', getHistory);
router.get('/historical-data/:ticker', getHistoricalData);

export default router;