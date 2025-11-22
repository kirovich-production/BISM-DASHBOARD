import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET: Obtener todos los proveedores o buscar por RUT
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rut = searchParams.get('rut');
    const search = searchParams.get('search'); // Búsqueda por nombre o RUT

    const { db } = await connectToDatabase();
    const proveedoresCollection = db.collection('proveedores');

    let query = {};

    // Búsqueda específica por RUT
    if (rut) {
      query = { rut };
    }
    // Búsqueda general por nombre o RUT
    else if (search) {
      query = {
        $or: [
          { rut: { $regex: search, $options: 'i' } },
          { nombre: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const proveedores = await proveedoresCollection
      .find(query)
      .sort({ nombre: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      proveedores
    });

  } catch (error) {
    console.error('[proveedores GET] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener proveedores',
    }, { status: 500 });
  }
}

// PUT: Actualizar clasificaciones de un proveedor
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { rut, nombre, clasificaciones } = body;

    if (!rut || !clasificaciones) {
      return NextResponse.json({
        success: false,
        message: 'Faltan datos requeridos: rut, clasificaciones',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const proveedoresCollection = db.collection('proveedores');

    const result = await proveedoresCollection.updateOne(
      { rut },
      {
        $set: {
          nombre: nombre || '',
          clasificaciones,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: result.upsertedCount > 0 
        ? 'Proveedor creado exitosamente' 
        : 'Proveedor actualizado exitosamente'
    });

  } catch (error) {
    console.error('[proveedores PUT] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al actualizar proveedor',
    }, { status: 500 });
  }
}

// DELETE: Eliminar un proveedor
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rut = searchParams.get('rut');

    if (!rut) {
      return NextResponse.json({
        success: false,
        message: 'Falta parámetro requerido: rut',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const proveedoresCollection = db.collection('proveedores');

    const result = await proveedoresCollection.deleteOne({ rut });

    if (result.deletedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se encontró el proveedor',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Proveedor eliminado exitosamente'
    });

  } catch (error) {
    console.error('[proveedores DELETE] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al eliminar proveedor',
    }, { status: 500 });
  }
}
