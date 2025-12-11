import { MongoClient, Db, Collection, ObjectId, Filter, Document, WithId } from 'mongodb';

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

/**
 * Helper para buscar documentos que pueden tener userId como ObjectId o como string
 * Esto resuelve la inconsistencia histórica en la base de datos
 */
export interface UserIdFilter {
  userId: string;
  [key: string]: unknown;
}

/**
 * Busca un documento por userId (intentando tanto ObjectId como string)
 * @param collection - Colección de MongoDB
 * @param userId - ID del usuario (string)
 * @param additionalFilter - Filtros adicionales (periodo, sucursal, etc.)
 * @returns Documento encontrado o null
 */
export async function findByUserId<T extends Document>(
  collection: Collection<T>,
  userId: string,
  additionalFilter: Record<string, unknown> = {}
): Promise<WithId<T> | null> {
  // Primero intentar con ObjectId
  try {
    const docWithObjectId = await collection.findOne({
      userId: new ObjectId(userId),
      ...additionalFilter,
    } as unknown as Filter<T>);
    
    if (docWithObjectId) {
      return docWithObjectId;
    }
  } catch {
    // ObjectId inválido, continuar con string
  }
  
  // Luego intentar con string
  const docWithString = await collection.findOne({
    userId: userId,
    ...additionalFilter,
  } as unknown as Filter<T>);
  
  return docWithString;
}

/**
 * Busca múltiples documentos por userId (intentando tanto ObjectId como string)
 * y combina los resultados eliminando duplicados por un campo clave
 * @param collection - Colección de MongoDB
 * @param userId - ID del usuario (string)
 * @param additionalFilter - Filtros adicionales
 * @param dedupeKey - Campo para eliminar duplicados (ej: 'periodo')
 * @returns Array de documentos únicos
 */
export async function findManyByUserId<T extends Document>(
  collection: Collection<T>,
  userId: string,
  additionalFilter: Record<string, unknown> = {},
  dedupeKey?: string
): Promise<WithId<T>[]> {
  const results: WithId<T>[] = [];
  
  // Buscar con ObjectId
  try {
    const docsWithObjectId = await collection.find({
      userId: new ObjectId(userId),
      ...additionalFilter,
    } as unknown as Filter<T>).toArray();
    
    results.push(...docsWithObjectId);
  } catch {
    // ObjectId inválido, continuar
  }
  
  // Buscar con string
  const docsWithString = await collection.find({
    userId: userId,
    ...additionalFilter,
  } as unknown as Filter<T>).toArray();
  
  results.push(...docsWithString);
  
  // Si no hay clave de deduplicación, retornar todos
  if (!dedupeKey) {
    return results;
  }
  
  // Eliminar duplicados basándose en el campo clave
  const seen = new Set<unknown>();
  return results.filter(doc => {
    const key = (doc as Record<string, unknown>)[dedupeKey];
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Elimina documentos por userId (tanto ObjectId como string)
 * @param collection - Colección de MongoDB
 * @param userId - ID del usuario (string)
 * @param additionalFilter - Filtros adicionales
 * @returns Número total de documentos eliminados
 */
export async function deleteManyByUserId<T extends Document>(
  collection: Collection<T>,
  userId: string,
  additionalFilter: Record<string, unknown> = {}
): Promise<number> {
  let totalDeleted = 0;
  
  // Eliminar con ObjectId
  try {
    const resultObjectId = await collection.deleteMany({
      userId: new ObjectId(userId),
      ...additionalFilter,
    } as unknown as Filter<T>);
    totalDeleted += resultObjectId.deletedCount;
  } catch {
    // ObjectId inválido, continuar
  }
  
  // Eliminar con string
  const resultString = await collection.deleteMany({
    userId: userId,
    ...additionalFilter,
  } as unknown as Filter<T>);
  totalDeleted += resultString.deletedCount;
  
  return totalDeleted;
}
