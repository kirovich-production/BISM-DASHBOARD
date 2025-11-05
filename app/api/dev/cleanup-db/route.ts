import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * ⚠️ ENDPOINT DE DESARROLLO - Eliminar TODAS las colecciones
 * GET /api/dev/cleanup-db
 * 
 * USAR SOLO EN DESARROLLO - Elimina todas las colecciones para partir desde cero
 */
export async function GET() {
  try {
    // ⚠️ Solo permitir en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Este endpoint solo está disponible en desarrollo' },
        { status: 403 }
      );
    }

    console.log('[CLEANUP] 🧹 Iniciando limpieza de base de datos...');

    const { db } = await connectToDatabase();

    // Obtener todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log(`[CLEANUP] 📋 Colecciones encontradas: ${collections.length}`);
    collections.forEach(c => console.log(`   - ${c.name}`));

    const results = [];

    // Eliminar colecciones específicas
    const collectionsToDelete = [
      'sessions',
      'excel_agua_nieves',
      'excel_agua_vivas',
      'excel_uploads'
    ];

    for (const collectionName of collectionsToDelete) {
      try {
        const exists = collections.some(c => c.name === collectionName);
        
        if (exists) {
          await db.collection(collectionName).drop();
          console.log(`[CLEANUP] ✅ Eliminada: ${collectionName}`);
          results.push({ collection: collectionName, status: 'deleted' });
        } else {
          console.log(`[CLEANUP] ⏭️ No existe: ${collectionName}`);
          results.push({ collection: collectionName, status: 'not_found' });
        }
      } catch (error) {
        console.error(`[CLEANUP] ❌ Error eliminando ${collectionName}:`, error);
        results.push({ collection: collectionName, status: 'error', error: String(error) });
      }
    }

    // Verificar qué colecciones quedan
    const remainingCollections = await db.listCollections().toArray();
    console.log(`[CLEANUP] 📊 Colecciones restantes: ${remainingCollections.length}`);
    remainingCollections.forEach(c => console.log(`   - ${c.name}`));

    return NextResponse.json({
      success: true,
      message: 'Limpieza completada',
      results,
      remainingCollections: remainingCollections.map(c => c.name)
    });

  } catch (error) {
    console.error('[CLEANUP] ❌ Error en limpieza:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
