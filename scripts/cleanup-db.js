import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://kirovich_dev:%408%40HcHDzUgHweD%2AA@kirovich.oedv2gq.mongodb.net/';
const MONGODB_DATABASE = 'bism-data';

async function cleanupDatabase() {
  console.log('🔌 Conectando a MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db(MONGODB_DATABASE);
    
    // Listar todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log(`\n📋 Colecciones encontradas: ${collections.length}`);
    collections.forEach(c => console.log(`  - ${c.name}`));
    
    // Eliminar todas las colecciones
    console.log('\n🗑️  Eliminando colecciones...');
    for (const collection of collections) {
      try {
        await db.collection(collection.name).drop();
        console.log(`  ✅ Eliminada: ${collection.name}`);
      } catch (error) {
        console.log(`  ❌ Error eliminando ${collection.name}:`, error.message);
      }
    }
    
    // Verificar que se eliminaron
    const remaining = await db.listCollections().toArray();
    console.log(`\n📊 Colecciones restantes: ${remaining.length}`);
    if (remaining.length > 0) {
      remaining.forEach(c => console.log(`  - ${c.name}`));
    } else {
      console.log('  ✅ Base de datos completamente limpia');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

cleanupDatabase();
