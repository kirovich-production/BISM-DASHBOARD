/**
 * Script para inicializar usuarios de prueba en MongoDB
 * 
 * Usuarios a crear:
 * 1. Agua nieves (principal)
 * 2. Usuario Test (prueba)
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

async function initializeUsers() {
  if (!MONGODB_URI || !MONGODB_DATABASE) {
    console.error('❌ Error: Variables de entorno no configuradas');
    console.error('   Asegúrate de que MONGODB_URI y MONGODB_DATABASE estén en .env.local');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Conectando a MongoDB...');
    await client.connect();
    
    const db = client.db(MONGODB_DATABASE);
    const collection = db.collection('excel_uploads');

    console.log('✅ Conectado exitosamente\n');

    // Verificar usuarios existentes
    console.log('📊 Verificando usuarios existentes...');
    const existingUserIds = await collection.distinct('userId');
    console.log(`   Usuarios encontrados: ${existingUserIds.length}`);
    existingUserIds.forEach(id => console.log(`   - ${id}`));

    // Crear índice compuesto para optimización
    console.log('\n🔧 Creando índices...');
    await collection.createIndex(
      { userId: 1, period: 1, version: 1 },
      { unique: true, name: 'userId_period_version_unique' }
    );
    await collection.createIndex(
      { userId: 1, uploadedAt: -1 },
      { name: 'userId_uploadedAt' }
    );
    console.log('   ✅ Índices creados');

    // Usuarios de prueba
    const testUsers = [
      { id: 'Agua nieves', name: 'Agua nieves' },
      { id: 'Usuario Test', name: 'Usuario Test' }
    ];

    console.log('\n👥 Usuarios configurados:');
    testUsers.forEach(user => {
      const exists = existingUserIds.includes(user.id);
      console.log(`   ${exists ? '✓' : '○'} ${user.name} ${exists ? '(ya existe)' : '(listo para usar)'}`);
    });

    console.log('\n📝 INSTRUCCIONES:');
    console.log('   1. Los usuarios se crearán automáticamente al subir el primer Excel');
    console.log('   2. Para "Agua nieves": Seleccionar en el dashboard y subir Excel');
    console.log('   3. Para "Usuario Test": Seleccionar en el dashboard y subir Excel');
    console.log('   4. Cada usuario tendrá sus propios datos separados\n');

    console.log('✅ Configuración completada');
    console.log('🚀 El sistema está listo para usar multi-usuarios\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

initializeUsers();
