import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://kirovich_dev:%408%40HcHDzUgHweD%2AA@kirovich.oedv2gq.mongodb.net/';
const MONGODB_DATABASE = 'bism-data';

async function analyzeLibroCompras() {
  console.log('Conectando a MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DATABASE);
    
    const libroCompras = await db.collection('libroCompras').findOne({});
    
    if (!libroCompras) {
      console.log('No hay datos en libroCompras');
      return;
    }
    
    console.log('ANALISIS DEL LIBRO DE COMPRAS');
    console.log('Usuario:', libroCompras.userId);
    console.log('Periodo:', libroCompras.periodo);
    console.log('Sucursal:', libroCompras.sucursal);
    console.log('Total transacciones:', libroCompras.transacciones.length);
    
    const costoVentaTransacciones = libroCompras.transacciones.filter(tx => {
      const cuenta = (tx.cuenta || '').toLowerCase().trim();
      return cuenta.includes('costo') && cuenta.includes('venta');
    });
    
    console.log('\nTRANSACCIONES CON COSTO DE VENTA:');
    console.log('Total encontradas:', costoVentaTransacciones.length);
    
    let sumaTotal = 0;
    const cuentasUnicas = new Set();
    
    costoVentaTransacciones.forEach((tx, index) => {
      console.log(`\n[${index + 1}] Cuenta: "${tx.cuenta}"`);
      console.log(`    Proveedor: ${tx.razonSocial}`);
      console.log(`    Fecha: ${tx.fechaDocto}`);
      console.log(`    Monto Total: ${tx.montoTotal}`);
      console.log(`    Tipo: ${typeof tx.montoTotal}`);
      
      cuentasUnicas.add(tx.cuenta);
      sumaTotal += (tx.montoTotal || 0);
    });
    
    console.log('\nNOMBRES DE CUENTAS UNICOS:');
    cuentasUnicas.forEach(c => console.log(`  - "${c}"`));
    
    console.log(`\nSUMA TOTAL: ${sumaTotal}`);
    console.log(`SUMA TOTAL FORMATEADO: $${sumaTotal.toLocaleString('es-CL')}`);
    
    console.log('\nVERIFICACION DE PARSEO:');
    const conProblemas = costoVentaTransacciones.filter(tx => {
      const monto = tx.montoTotal;
      return monto > 0 && monto < 100000;
    });
    
    if (conProblemas.length > 0) {
      console.log(`${conProblemas.length} transacciones con montos pequenos:`);
      conProblemas.forEach(tx => {
        console.log(`  - ${tx.razonSocial}: $${tx.montoTotal}`);
      });
    } else {
      console.log('Todos los montos parecen correctos (> $100.000)');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

analyzeLibroCompras();
