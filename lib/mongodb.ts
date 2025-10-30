import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Por favor define la variable MONGODB_URI en .env.local');
}

if (!process.env.MONGODB_DATABASE) {
  throw new Error('Por favor define la variable MONGODB_DATABASE en .env.local');
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DATABASE;

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
