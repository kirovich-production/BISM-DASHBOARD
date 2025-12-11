import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getUserCollectionName } from '@/lib/mongodb';
import { UserSession } from '@/types';
import { randomUUID } from 'crypto';
import { COLLECTIONS, SESSION_CONFIG } from '@/lib/constants';

/**
 * POST /api/auth/session - Crear nueva sesión
 * Body: { userId: string, userName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, userName } = await request.json();

    if (!userId || !userName) {
      return NextResponse.json(
        { success: false, error: 'userId y userName son requeridos' },
        { status: 400 }
      );
    }

    const client = await connectToDatabase();
    const db = client.db;

    // 🔍 VALIDAR QUE EL USUARIO EXISTE (verificando si tiene colección propia)
    // Cada usuario tiene su colección: excel_agua_nieves, excel_juan, etc.
    const userCollectionName = getUserCollectionName(userName);
    
    // Verificar si la colección existe listando todas las colecciones
    const collections = await db.listCollections({ name: userCollectionName }).toArray();
    const collectionExists = collections.length > 0;
    
    if (collectionExists) {
      // Verificar si tiene al menos un documento
      await db.collection(userCollectionName).countDocuments({});
    } else {
      // Permitir crear sesión para usuarios nuevos
    }

    // 🗑️ LIMPIAR SESIONES ANTIGUAS DE ESTE USUARIO (una sesión por usuario)
    await db.collection(COLLECTIONS.SESSIONS).deleteMany({ userId });

    // 🆕 CREAR NUEVA SESIÓN
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_CONFIG.DURATION_DAYS * 24 * 60 * 60 * 1000);
    const sessionId = randomUUID();

    const newSession: UserSession = {
      sessionId,
      userId,
      userName,
      createdAt: now,
      expiresAt,
      lastActivityAt: now,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown'
    };

    await db.collection(COLLECTIONS.SESSIONS).insertOne(newSession);

    // 🍪 GUARDAR SESSION_ID EN COOKIE
    const response = NextResponse.json({
      success: true,
      sessionId,
      userId,
      userName
    });

    response.cookies.set(SESSION_CONFIG.COOKIE_NAME, sessionId, {
      httpOnly: true,           // No accesible desde JavaScript (seguridad)
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'lax',          // Protección CSRF
      maxAge: SESSION_CONFIG.DURATION_DAYS * 24 * 60 * 60, // 7 días
      path: '/'
    });


    return response;

  } catch (error) {
    console.error('[SESSION] Error al crear sesión:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear sesión' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/session - Obtener sesión actual
 * Lee la cookie y valida la sesión
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(SESSION_CONFIG.COOKIE_NAME)?.value;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'No hay sesión activa'
      });
    }

    const { db } = await connectToDatabase();

    // 🔍 BUSCAR SESIÓN EN BD
    const session = await db.collection(COLLECTIONS.SESSIONS).findOne({ sessionId }) as UserSession | null;

    if (!session) {
      console.warn(`[SESSION] ⚠️ Sesión no encontrada: ${sessionId}`);
      return NextResponse.json({
        success: false,
        error: 'Sesión no válida'
      });
    }

    // ⏰ VERIFICAR SI LA SESIÓN EXPIRÓ
    if (new Date() > session.expiresAt) {
      console.warn(`[SESSION] ⏰ Sesión expirada: ${sessionId} (usuario: ${session.userName})`);
      await db.collection(COLLECTIONS.SESSIONS).deleteOne({ sessionId });
      
      const response = NextResponse.json({
        success: false,
        error: 'Sesión expirada'
      });
      response.cookies.delete(SESSION_CONFIG.COOKIE_NAME);
      return response;
    }

    // ✅ No validar colección Excel - Los usuarios de Libro de Compras no tienen colección Excel
    // La validación se hace al momento de cargar datos, no en la sesión

    // ✅ SESIÓN VÁLIDA - Actualizar última actividad
    await db.collection(COLLECTIONS.SESSIONS).updateOne(
      { sessionId },
      { $set: { lastActivityAt: new Date() } }
    );


    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      userId: session.userId,
      userName: session.userName
    });

  } catch (error) {
    console.error('[SESSION] Error al validar sesión:', error);
    return NextResponse.json(
      { success: false, error: 'Error al validar sesión' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/session - Cerrar sesión (logout)
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(SESSION_CONFIG.COOKIE_NAME)?.value;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'No hay sesión activa'
      });
    }

    const { db } = await connectToDatabase();

    // 🗑️ ELIMINAR SESIÓN DE BD
    await db.collection(COLLECTIONS.SESSIONS).deleteOne({ sessionId });

    // 🍪 ELIMINAR COOKIE
    const response = NextResponse.json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });

    response.cookies.delete(SESSION_CONFIG.COOKIE_NAME);

    return response;

  } catch (error) {
    console.error('[SESSION] Error al cerrar sesión:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}
