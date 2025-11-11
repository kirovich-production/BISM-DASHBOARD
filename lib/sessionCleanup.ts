import { connectToDatabase } from '@/lib/mongodb';

const SESSION_COLLECTION = 'sessions';

/**
 * Limpia sesiones expiradas de la base de datos
 * Debe ejecutarse periódicamente (cron job o en cada request)
 */
export async function cleanExpiredSessions() {
  try {
    const { db } = await connectToDatabase();

    const now = new Date();

    // Eliminar sesiones donde expiresAt < ahora
    const result = await db.collection(SESSION_COLLECTION).deleteMany({
      expiresAt: { $lt: now }
    });

    if (result.deletedCount > 0) {
    }

    return result.deletedCount;
  } catch (error) {
    console.error('[CLEANUP] Error al limpiar sesiones expiradas:', error);
    return 0;
  }
}

/**
 * Elimina todas las sesiones de un usuario específico
 * Útil cuando se elimina un usuario
 */
export async function deleteUserSessions(userId: string) {
  try {
    const { db } = await connectToDatabase();

    const result = await db.collection(SESSION_COLLECTION).deleteMany({ userId });


    return result.deletedCount;
  } catch (error) {
    console.error('[CLEANUP] Error al eliminar sesiones de usuario:', error);
    return 0;
  }
}

/**
 * Obtiene todas las sesiones activas (para admin)
 */
export async function getActiveSessions() {
  try {
    const { db } = await connectToDatabase();

    const now = new Date();

    const sessions = await db.collection(SESSION_COLLECTION)
      .find({ expiresAt: { $gt: now } })
      .sort({ lastActivityAt: -1 })
      .toArray();

    return sessions;
  } catch (error) {
    console.error('[CLEANUP] Error al obtener sesiones activas:', error);
    return [];
  }
}
