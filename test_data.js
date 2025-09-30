// Test script to verify data fetching
import yahooFinance from 'yahoo-finance2';
import { MongoClient } from 'mongodb';

const SYMBOLS = ['RELIANCE.NS', 'TCS.NS'];
const MONGO_URL = 'mongodb://localhost:27017';

async function testDataFetch() {
  console.log('Testing Yahoo Finance data fetch...');
  
  try {
    // Test Yahoo Finance
    const quote = await yahooFinance.quote('RELIANCE.NS');
    console.log('Yahoo Finance test successful:', {
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      volume: quote.regularMarketVolume
    });
  } catch (e) {
    console.log('Yahoo Finance error:', e.message);
  }

  try {
    // Test MongoDB
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log('MongoDB connected successfully');
    const db = client.db('nifty15');
    const col = db.collection('ticks');
    const count = await col.countDocuments();
    console.log('Documents in ticks collection:', count);
    await client.close();
  } catch (e) {
    console.log('MongoDB error:', e.message);
  }
}

testDataFetch();

