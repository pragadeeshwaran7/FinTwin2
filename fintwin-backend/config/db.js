import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

export const connectDB = async () => {
  try {
    await client.connect();
    db = client.db("fintwin");
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

export const getDb = () => {
  if (db) {
    return db;
  }
  throw 'No database found!';
};
