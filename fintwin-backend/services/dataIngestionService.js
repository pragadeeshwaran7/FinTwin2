import { getDb } from '../config/db.js';

export const getLiveStockData = async (symbol) => {
  const db = getDb();
  const latestData = await db.collection('live_data')
    .find({ ticker: symbol.toUpperCase() })
    .sort({ timestamp: -1 })
    .limit(1)
    .toArray();

  if (latestData.length === 0) {
    const error = new Error('No data found for this ticker. Please run the Python script to fetch the data first.');
    error.statusCode = 404;
    throw error;
  }

  const doc = latestData[0];

  return {
    price: doc.price,
    timestamp: doc.timestamp.toISOString(),
  };
};