import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface User {
  _id?: ObjectId;
  name: string;
  sucursales: string[];
  createdAt: Date;
}

// GET - Obtener todos los usuarios desde la colección "users"
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    // Verificar si se solicita un usuario específico por ID
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Buscar usuario específico por ID
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        users: [{
          _id: user._id?.toString() || '',
          name: user.name,
          sucursales: user.sucursales || [],
          createdAt: user.createdAt.toISOString()
        }]
      });
    }

    // Obtener todos los usuarios
    const users = await usersCollection
      .find({})
      .sort({ name: 1 })
      .toArray();

    // Convertir _id de ObjectId a string para enviar al cliente
    const usersWithStringId = users.map(user => ({
      _id: user._id?.toString() || '',
      name: user.name,
      sucursales: user.sucursales || [],
      createdAt: user.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      users: usersWithStringId
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener los usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo usuario en la colección "users"
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sucursales } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre del usuario es obligatorio' },
        { status: 400 }
      );
    }

    if (!sucursales || !Array.isArray(sucursales) || sucursales.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Debe proporcionar al menos una unidad de negocio' },
        { status: 400 }
      );
    }

    const userName = name.trim();

    // Validar que el nombre no contenga espacios
    if (userName.includes(' ')) {
      return NextResponse.json(
        { success: false, error: 'El nombre de usuario no puede contener espacios. Usa guiones bajos (_)' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    // Verificar si ya existe un usuario con ese nombre
    const existingUser = await usersCollection.findOne({ name: userName });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `El usuario "${userName}" ya existe` },
        { status: 400 }
      );
    }

    // Crear nuevo usuario en la base de datos
    const newUser: User = {
      name: userName,
      sucursales: sucursales.map((s: string) => s.trim()).filter((s: string) => s),
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    // Retornar el usuario creado con el _id
    const createdUser = {
      _id: result.insertedId.toString(),
      name: userName,
      sucursales: newUser.sucursales,
      createdAt: newUser.createdAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      user: createdUser,
      message: `Usuario "${userName}" creado exitosamente`
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear el usuario' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar sucursales de un usuario existente
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sucursales } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'El ID del usuario es obligatorio' },
        { status: 400 }
      );
    }

    if (!sucursales || !Array.isArray(sucursales) || sucursales.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Debe proporcionar al menos una unidad de negocio' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    // Verificar que el usuario existe
    const existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar sucursales del usuario
    const cleanedSucursales = sucursales.map((s: string) => s.trim()).filter((s: string) => s);

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { sucursales: cleanedSucursales } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'No se realizaron cambios' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sucursales actualizadas exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el usuario' },
      { status: 500 }
    );
  }
}
