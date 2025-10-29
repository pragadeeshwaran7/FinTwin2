import express from "express";
import { getPortfolioSummary } from "../controllers/analyticsController.js";

const router = express.Router();

// Example: /api/analytics/portfolio
router.post("/portfolio", getPortfolioSummary);

export default router;
