import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET: Obtener todos los proveedores o buscar por filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search'); // Búsqueda por nombre o RUT

    const { db } = await connectToDatabase();
    const proveedoresCollection = db.collection('proveedoresMaestro');

    let query = {};

    // Búsqueda general por nombre o RUT
    if (search) {
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

// POST: Crear un nuevo proveedor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rut, nombre, centroCosto, tipoCuenta, observaciones } = body;

    if (!rut || !nombre) {
      return NextResponse.json({
        success: false,
        message: 'Faltan datos requeridos: rut, nombre',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const proveedoresCollection = db.collection('proveedoresMaestro');

    // Verificar si ya existe un proveedor con ese RUT
    const existingProveedor = await proveedoresCollection.findOne({ rut });
    if (existingProveedor) {
      return NextResponse.json({
        success: false,
        message: 'Ya existe un proveedor con ese RUT',
      }, { status: 400 });
    }

    const nuevoProveedor = {
      rut: rut.trim(),
      nombre: nombre.trim(),
      centroCosto: centroCosto?.trim() || '',
      tipoCuenta: tipoCuenta?.trim() || '',
      observaciones: observaciones?.trim() || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await proveedoresCollection.insertOne(nuevoProveedor);

    return NextResponse.json({
      success: true,
      message: 'Proveedor creado exitosamente',
      proveedor: { _id: result.insertedId, ...nuevoProveedor }
    });

  } catch (error) {
    console.error('[proveedores POST] ❌ Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al crear proveedor',
    }, { status: 500 });
  }
}

// PUT: Actualizar un proveedor existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { _id, rut, nombre, centroCosto, tipoCuenta, observaciones } = body;

    if (!_id || !rut || !nombre) {
      return NextResponse.json({
        success: false,
        message: 'Faltan datos requeridos: _id, rut, nombre',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const proveedoresCollection = db.collection('proveedoresMaestro');

    const result = await proveedoresCollection.updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          rut: rut.trim(),
          nombre: nombre.trim(),
          centroCosto: centroCosto?.trim() || '',
          tipoCuenta: tipoCuenta?.trim() || '',
          observaciones: observaciones?.trim() || '',
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se encontró el proveedor',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Proveedor actualizado exitosamente'
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Falta parámetro requerido: id',
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const proveedoresCollection = db.collection('proveedoresMaestro');

    const result = await proveedoresCollection.deleteOne({ _id: new ObjectId(id) });

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
