import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/types';

// GET - Obtener todos los usuarios (cada usuario tiene su propia colección excel_{nombre})
export async function GET() {
  try {
    const { db } = await connectToDatabase();

    // Obtener todas las colecciones que empiezan con "excel_"
    const collections = await db.listCollections().toArray();
    const excelCollections = collections
      .map(c => c.name)
      .filter(name => name.startsWith('excel_'))
      .map(name => name.replace('excel_', ''));

    // Crear objetos User básicos
    const users: User[] = excelCollections.map(userName => ({
      id: userName,
      name: userName,
      createdAt: new Date()
    }));

    // Ordenar por nombre
    users.sort((a, b) => a.name.localeCompare(b.name));


    return NextResponse.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener los usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo usuario (validar que no exista)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del usuario es obligatorio' },
        { status: 400 }
      );
    }

    const userName = name.trim();

    const { db } = await connectToDatabase();
    const collection = db.collection('excel_uploads');

    // Verificar si ya existe un usuario con ese nombre
    const existingUser = await collection.findOne({ userId: userName });

    if (existingUser) {
      return NextResponse.json(
        { error: `El usuario "${userName}" ya existe` },
        { status: 400 }
      );
    }

    // Crear objeto User
    const newUser: User = {
      id: userName,
      name: userName,
      createdAt: new Date()
    };

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `Usuario "${userName}" creado exitosamente`
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      { error: 'Error al crear el usuario' },
      { status: 500 }
    );
  }
}
