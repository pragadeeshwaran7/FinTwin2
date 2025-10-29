import { getLiveStockData } from "../services/dataIngestionService.js";

export const fetchStockData = async (req, res, next) => {
  const { symbol } = req.params;

  try {
    const data = await getLiveStockData(symbol);
    res.json({ success: true, symbol, data });
  } catch (err) {
    next(err);
  }
};
