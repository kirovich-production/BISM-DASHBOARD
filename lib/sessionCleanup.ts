import { connectToDatabase } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/constants';

/**
 * Limpia sesiones expiradas de la base de datos
 * Debe ejecutarse periódicamente (cron job o en cada request)
 */
export async function cleanExpiredSessions() {
  try {
    const { db } = await connectToDatabase();

    const now = new Date();

    // Eliminar sesiones donde expiresAt < ahora
    const result = await db.collection(COLLECTIONS.SESSIONS).deleteMany({
      expiresAt: { $lt: now }
    });

    if (result.deletedCount > 0) {
      console.log(`[CLEANUP] ${result.deletedCount} sesiones expiradas eliminadas`);
    }

    return result.deletedCount;
  } catch (error) {
    console.error('[CLEANUP] Error al limpiar sesiones expiradas:', error);
    return 0;
  }
}
