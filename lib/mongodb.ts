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

// Función helper para generar nombre de colección por usuario
export function getUserCollectionName(userName: string): string {
  // Normalizar el nombre: quitar espacios, acentos, caracteres especiales
  // y convertir a minúsculas
  const normalized = userName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9]/g, '_') // Reemplazar caracteres especiales con _
    .replace(/_+/g, '_') // Evitar múltiples guiones bajos consecutivos
    .replace(/^_|_$/g, ''); // Quitar guiones bajos al inicio/fin
  
  return `excel_${normalized}`;
}
