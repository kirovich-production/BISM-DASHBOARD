import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface User {
  _id?: ObjectId;
  name: string;
  createdAt: Date;
}

// GET - Obtener todos los usuarios desde la colección "users"
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    // Obtener todos los usuarios
    const users = await usersCollection
      .find({})
      .sort({ name: 1 })
      .toArray();

    // Convertir _id de ObjectId a string para enviar al cliente
    const usersWithStringId = users.map(user => ({
      _id: user._id?.toString() || '',
      name: user.name,
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
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre del usuario es obligatorio' },
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
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    // Retornar el usuario creado con el _id
    const createdUser = {
      _id: result.insertedId.toString(),
      name: userName,
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
