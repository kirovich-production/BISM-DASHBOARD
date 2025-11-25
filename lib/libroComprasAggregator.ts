import { LibroComprasTransaction, EERRData, EERRCategory, EERRRow } from '@/types';

/**
 * Nombres de meses en español (calendario chileno)
 */
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Estructura predefinida de cuentas para EERR
 */
const ESTRUCTURA_EERR = [
  {
    name: 'INGRESOS OPERACIONALES',
    items: ['Ventas', 'Costo de ventas', 'Transbank', 'Bonificacion por tramo']
  },
  {
    name: 'MARGEN BRUTO OPERACIONAL',
    items: [],
    isCalculated: true
  },
  {
    name: 'GASTOS DE REMUNERACION',
    items: [
      'Sueldo Personal',
      'Seguro de Cesantia',
      'Seguro de Accidentes Trabajo',
      'Seguro Invalidez y Sobrevivencia',
      'Finiquitos',
      'Honorarios BH',
      'Honorarios Factura BSM',
      'Provision de Vacaciones'
    ]
  },
  {
    name: 'GASTOS DE OPERACION',
    items: [
      'Consumo de Electricidad',
      'Consumo de Agua',
      'Comunicaciones',
      'Articulos de Aseo',
      'Mantencion y Reparacion',
      'Gastos Generales',
      'Servicios Externos',
      'Caja Chica'
    ]
  },
  {
    name: 'GASTOS DE ADMINISTRACION',
    items: [
      'Materiales y Utiles de Oficina',
      'Publicidad y Propaganda BSM',
      'Licencias y Software',
      'Seguros',
      'Gastos Notariales',
      'Gastos Bancarios',
      'Contribuciones',
      'Patentes Municipales',
      'Gastos generales',
      'Recaudacion y Sencillo'
    ]
  },
  {
    name: 'OTROS GASTOS',
    items: [
      'Arriendo',
      'Gestion BSM',
      'Supervisor punto de venta (S.M)'
    ]
  },
  {
    name: 'EBIDTA',
    items: [],
    isCalculated: true
  },
  {
    name: 'OTROS EGRESOS FUERA DE EXPLOTACION',
    items: [
      'Pago Cuota Leasing',
      'Pago Cuota creditos Bancarios',
      'Directorio'
    ]
  },
  {
    name: 'RESULTADO NETO',
    items: [],
    isCalculated: true
  }
];

/**
 * Convierte transacciones de Libro de Compras a formato EERRData
 * manteniendo la estructura predefinida de cuentas.
 * 
 * @param transacciones - Array de transacciones del Libro de Compras
 * @param periodo - Período en formato "YYYY-MM"
 * @returns Estructura EERRData compatible con SevillaTable/LabranzaTable
 */
export function aggregateLibroComprasToEERR(
  transacciones: LibroComprasTransaction[],
  periodo: string
): EERRData {
  // Extraer año y mes del período (YYYY-MM)
  const [year, mesStr] = periodo.split('-');
  const periodoMes = parseInt(mesStr); // 1-12
  
  // Solo mostrar el mes del período
  const months = [MESES[periodoMes - 1]]; // -1 porque MESES es 0-indexed
  const mesNombre = months[0];
  
  // Agregar CONSOLIDADO al final
  const allMonths = [...months, 'CONSOLIDADO'];
  
  // Agrupar transacciones por cuenta (normalizar nombres)
  const transaccionesPorCuenta = new Map<string, number>();
  
  transacciones.forEach(tx => {
    const fechaDocto = new Date(tx.fechaDocto);
    const mesTransaccion = fechaDocto.getMonth() + 1; // 1-12
    const añoTransaccion = fechaDocto.getFullYear().toString();
    
    // Solo considerar transacciones del período exacto
    if (añoTransaccion !== year || mesTransaccion !== periodoMes) {
      return;
    }
    
    const cuenta = (tx.cuenta || 'Sin Clasificar').trim();
    const monto = tx.montoTotal || 0;
    
    const montoActual = transaccionesPorCuenta.get(cuenta) || 0;
    transaccionesPorCuenta.set(cuenta, montoActual + monto);
  });
  
  // Construir categorías con estructura predefinida
  const categories: EERRCategory[] = [];
  
  ESTRUCTURA_EERR.forEach(estructuraCategoria => {
    const rows: EERRRow[] = [];
    
    // Agregar items de la categoría
    estructuraCategoria.items.forEach(itemName => {
      const row: EERRRow = { Item: itemName };
      
      // Buscar monto en transacciones (con búsqueda flexible)
      let monto = 0;
      for (const [cuentaTx, montoTx] of transaccionesPorCuenta.entries()) {
        // Normalizar y comparar (case-insensitive, sin espacios extra)
        const cuentaNormalizada = cuentaTx.toLowerCase().trim();
        const itemNormalizado = itemName.toLowerCase().trim();
        
        if (cuentaNormalizada.includes(itemNormalizado) || itemNormalizado.includes(cuentaNormalizada)) {
          monto += montoTx;
        }
      }
      
      // Agregar valores por mes
      row[`${mesNombre} Monto`] = monto;
      row[`${mesNombre} %`] = 0;
      
      // CONSOLIDADO
      row['CONSOLIDADO Monto'] = monto;
      row['CONSOLIDADO %'] = 0;
      row['CONSOLIDADO Promedio'] = monto;
      
      rows.push(row);
    });
    
    // Calcular total de categoría (si no es calculada)
    let totalRow: EERRRow | undefined;
    
    if (!estructuraCategoria.isCalculated) {
      totalRow = { Item: `TOTAL ${estructuraCategoria.name}` };
      
      const totalMonto = rows.reduce((sum, row) => {
        const valorMonto = row[`${mesNombre} Monto`];
        return sum + (typeof valorMonto === 'number' ? valorMonto : 0);
      }, 0);
      
      totalRow[`${mesNombre} Monto`] = totalMonto;
      totalRow[`${mesNombre} %`] = 0;
      totalRow['CONSOLIDADO Monto'] = totalMonto;
      totalRow['CONSOLIDADO %'] = 0;
      totalRow['CONSOLIDADO Promedio'] = totalMonto;
    }
    
    categories.push({
      name: estructuraCategoria.name,
      rows,
      total: totalRow
    });
  });
  
  return {
    sheetName: `Libro de Compras - ${periodo}`,
    months: allMonths,
    categories
  };
}
