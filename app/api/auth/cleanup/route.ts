import { NextResponse } from 'next/server';
import { cleanExpiredSessions } from '@/lib/sessionCleanup';

/**
 * GET /api/auth/cleanup - Limpiar sesiones expiradas
 * Este endpoint puede llamarse desde un cron job o manualmente
 */
export async function GET() {
  try {
    console.log('[CLEANUP] 🧹 Iniciando limpieza de sesiones expiradas...');
    
    const deletedCount = await cleanExpiredSessions();
    
    return NextResponse.json({
      success: true,
      message: `${deletedCount} sesiones expiradas eliminadas`,
      deletedCount
    });
  } catch (error) {
    console.error('[CLEANUP] Error en limpieza:', error);
    return NextResponse.json(
      { success: false, error: 'Error en limpieza de sesiones' },
      { status: 500 }
    );
  }
}
