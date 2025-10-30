import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/stocks', (req, res) => {
    try {
        const stocksFilePath = path.join(__dirname, '..', 'stocks.json');
        const stocks = JSON.parse(fs.readFileSync(stocksFilePath, 'utf8'));
        res.json(stocks);
    } catch (error) {
        console.error('Error reading stocks.json:', error);
        res.status(500).json({ error: 'Failed to fetch stocks list' });
    }
});

export default router;