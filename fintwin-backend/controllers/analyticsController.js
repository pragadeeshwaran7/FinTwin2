import { analyzePortfolio } from "../services/analyticsService.js";

export const getPortfolioSummary = async (req, res, next) => {
  const portfolioData = req.body;

  try {
    const result = await analyzePortfolio(portfolioData);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
};
