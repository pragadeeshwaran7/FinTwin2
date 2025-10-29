import express from "express";
import { fetchStockData } from "../controllers/dataController.js";

const router = express.Router();

// Example: /api/data/stock/AAPL
router.get("/stock/:symbol", fetchStockData);

export default router;
