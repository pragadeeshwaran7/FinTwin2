import { getAndStorePrice as getAndStorePriceService, getHistory as getHistoryService, getHistoricalData as getHistoricalDataService } from '../services/financeService.js';

export const getAndStorePrice = async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await getAndStorePriceService(ticker);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const history = await getHistoryService(ticker);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

export const getHistoricalData = async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const data = await getHistoricalDataService(ticker);
    res.json(data);
  } catch (error) {
    next(error);
  }
};