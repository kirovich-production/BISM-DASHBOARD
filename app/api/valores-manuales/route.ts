import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * GET /api/valores-manuales
 * Obtiene valores manuales ingresados por el usuario
 * Query params: userId, periodo, sucursal
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const periodo = searchParams.get('periodo');
    const sucursal = searchParams.get('sucursal');

    if (!userId || !periodo || !sucursal) {
      return NextResponse.json({
        success: false,
        error: 'Faltan parámetros requeridos: userId, periodo, sucursal',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('valoresManuales');

    // Buscar todos los valores manuales para este contexto
    const valores = await collection.find({
      userId,
      periodo,
      sucursal
    }).toArray();

    // Convertir a Map para fácil acceso por cuenta
    const valoresPorCuenta: { [cuenta: string]: number } = {};
    valores.forEach(v => {
      valoresPorCuenta[v.cuenta] = v.monto;
    });

    return NextResponse.json({
      success: true,
      valores: valoresPorCuenta
    });

  } catch (error) {
    console.error('[valores-manuales GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener valores manuales',
    }, { status: 500 });
  }
}

/**
 * POST /api/valores-manuales
 * Guarda o actualiza un valor manual
 * Body: { userId, periodo, sucursal, cuenta, monto }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, periodo, sucursal, cuenta, monto } = body;

    if (!userId || !periodo || !sucursal || !cuenta || monto === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Faltan datos requeridos: userId, periodo, sucursal, cuenta, monto',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('valoresManuales');

    // Buscar si ya existe
    const existing = await collection.findOne({
      userId,
      periodo,
      sucursal,
      cuenta
    });

    if (existing) {
      // Actualizar
      await collection.updateOne(
        { userId, periodo, sucursal, cuenta },
        {
          $set: {
            monto,
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Crear nuevo
      await collection.insertOne({
        userId,
        periodo,
        sucursal,
        cuenta,
        monto,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Valor manual guardado exitosamente',
      cuenta,
      monto
    });

  } catch (error) {
    console.error('[valores-manuales POST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al guardar valor manual',
    }, { status: 500 });
  }
}
