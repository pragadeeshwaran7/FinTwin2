import { getDb } from '../config/db.js';

export const getAndStorePrice = async (ticker) => {
  const db = getDb();
  const latestData = await db.collection('live_data')
    .find({ ticker: ticker.toUpperCase() })
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
    ticker: doc.ticker, 
    price: doc.price, 
    timestamp: doc.timestamp.toISOString() 
  };
};

export const getHistory = async (ticker) => {
  const db = getDb();
  const cursor = await db.collection('live_data').find({ ticker: ticker.toUpperCase() }).sort({ timestamp: -1 }).limit(10);
  const history = await cursor.toArray();

  return history.map(doc => ({
    price: doc.price,
    timestamp: doc.timestamp.toISOString(),
  }));
};

export const getHistoricalData = async (ticker) => {
  const db = getDb();
  const cursor = await db.collection('historical_data').find({ ticker: ticker.toUpperCase() }).sort({ date: 1 });
  const historicalData = await cursor.toArray();
  return historicalData;
};