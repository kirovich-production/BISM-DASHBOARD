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
    items: ['Ventas', 'Costo de venta', 'Transbank', 'Bonificacion por tramo'],
    hasMargenBruto: true
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
      'Gastos Notariales',
      'Gastos Bancarios',
      'Contribuciones',
      'Patentes Municipales',
      'Gastos generales',
      'Recaudacion y Sencillo',
      'Seguros'
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
 * Clasifica una cuenta del LC en una categoría EERR según keywords
 */
function clasificarCuenta(cuenta: string): string {
  const cuentaLower = cuenta.toLowerCase();
  
  // INGRESOS OPERACIONALES
  if (cuentaLower.includes('venta') || cuentaLower.includes('ingreso') || 
      cuentaLower.includes('revenue') || cuentaLower.includes('transbank') ||
      cuentaLower.includes('bonificacion')) {
    return 'INGRESOS OPERACIONALES';
  }
  
  // GASTOS DE REMUNERACION
  if (cuentaLower.includes('sueldo') || cuentaLower.includes('honorario') || 
      cuentaLower.includes('remuneracion') || 
      cuentaLower.includes('finiquito') || cuentaLower.includes('vacaciones') ||
      cuentaLower.includes('gratificacion') || cuentaLower.includes('bono') ||
      cuentaLower.includes('cesantia') || cuentaLower.includes('accidente') ||
      cuentaLower.includes('invalidez') || cuentaLower.includes('sobrevivencia') ||
      cuentaLower.includes('provision')) {
    return 'GASTOS DE REMUNERACION';
  }
  
  // GASTOS DE OPERACION
  if (cuentaLower.includes('electricidad') || cuentaLower.includes('agua') || 
      cuentaLower.includes('luz') || cuentaLower.includes('comunicacion') ||
      cuentaLower.includes('aseo') || cuentaLower.includes('mantencion') ||
      cuentaLower.includes('reparacion') || cuentaLower.includes('servicio') ||
      cuentaLower.includes('caja chica') || cuentaLower.includes('general')) {
    return 'GASTOS DE OPERACION';
  }
  
  // GASTOS DE ADMINISTRACION
  if (cuentaLower.includes('oficina') || cuentaLower.includes('publicidad') || 
      cuentaLower.includes('licencia') || cuentaLower.includes('software') ||
      cuentaLower.includes('notarial') || cuentaLower.includes('bancario') ||
      cuentaLower.includes('contribucion') || cuentaLower.includes('patente') ||
      cuentaLower.includes('recaudacion') || cuentaLower.includes('propaganda') ||
      cuentaLower.includes('materiales') || cuentaLower.includes('utiles') ||
      cuentaLower.includes('seguro')) {
    return 'GASTOS DE ADMINISTRACION';
  }
  
  // OTROS GASTOS
  if (cuentaLower.includes('arriendo') || cuentaLower.includes('gestion') || 
      cuentaLower.includes('supervisor')) {
    return 'OTROS GASTOS';
  }
  
  // OTROS EGRESOS FUERA DE EXPLOTACION
  if (cuentaLower.includes('leasing') || cuentaLower.includes('credito') || 
      cuentaLower.includes('prestamo') || cuentaLower.includes('directorio') ||
      cuentaLower.includes('interes') || cuentaLower.includes('cuota')) {
    return 'OTROS EGRESOS FUERA DE EXPLOTACION';
  }
  
  // Default: GASTOS DE OPERACION
  return 'GASTOS DE OPERACION';
}

/**
 * Convierte transacciones de Libro de Compras a formato EERRData
 * manteniendo la estructura predefinida de cuentas y agregando cuentas del LC automáticamente.
 * 
 * @param transacciones - Array de transacciones del Libro de Compras
 * @param periodo - Período en formato "YYYY-MM"
 * @param valoresManuales - Valores ingresados manualmente por el usuario (ej: Ventas)
 * @returns Estructura EERRData compatible con SevillaTable/LabranzaTable
 */
export function aggregateLibroComprasToEERR(
  transacciones: LibroComprasTransaction[],
  periodo: string,
  valoresManuales: { [cuenta: string]: number } = {}
): EERRData {
  // Extraer año y mes del período (YYYY-MM)
  const [, mesStr] = periodo.split('-');
  const periodoMes = parseInt(mesStr); // 1-12
  
  // Solo mostrar el mes del período
  const months = [MESES[periodoMes - 1]]; // -1 porque MESES es 0-indexed
  const mesNombre = months[0];
  
  // Agregar CONSOLIDADO al final
  const allMonths = [...months, 'CONSOLIDADO'];
  
  // Agrupar transacciones por cuenta exacta
  // TODAS las transacciones del documento ya pertenecen al período asignado
  // No filtrar por fechaDocto porque el archivo completo es del período
  const transaccionesPorCuenta = new Map<string, number>();
  
  transacciones.forEach(tx => {
    const cuenta = (tx.cuenta || 'Sin Clasificar').trim();
    const monto = tx.montoTotal || 0;
    
    const montoActual = transaccionesPorCuenta.get(cuenta) || 0;
    transaccionesPorCuenta.set(cuenta, montoActual + monto);
  });
  
  // Rastrear qué cuentas del LC ya fueron mapeadas
  const cuentasMapeadas = new Set<string>();
  
  // Construir categorías con estructura predefinida
  const categories: EERRCategory[] = [];
  
  ESTRUCTURA_EERR.forEach(estructuraCategoria => {
    const rows: EERRRow[] = [];
    
    // Agregar items predefinidos de la categoría
    estructuraCategoria.items.forEach(itemName => {
      const row: EERRRow = { Item: itemName };
      
      // Primero verificar si hay valor manual para esta cuenta
      let monto = valoresManuales[itemName] || 0;
      
      // Si no hay valor manual, buscar en transacciones del LC
      if (monto === 0) {
        const itemNormalizado = itemName.toLowerCase().trim();
        
        for (const [cuentaTx, montoTx] of transaccionesPorCuenta.entries()) {
          const cuentaNormalizada = cuentaTx.toLowerCase().trim();
          
          // Match exacto o case-insensitive
          if (cuentaTx === itemName || cuentaNormalizada === itemNormalizado) {
            monto = montoTx;
            cuentasMapeadas.add(cuentaTx);
            break;
          }
        }
      }
      
      // Agregar valores por mes
      row[`${mesNombre} Monto`] = monto;
      row[`${mesNombre} %`] = 0; // Se calcula después basado en Ventas
      
      // CONSOLIDADO
      row['CONSOLIDADO Monto'] = monto;
      row['CONSOLIDADO %'] = 0; // Se calcula después basado en Ventas
      row['CONSOLIDADO Promedio'] = monto;
      
      rows.push(row);
    });
    
    // Agregar cuentas adicionales del LC que pertenecen a esta categoría
    if (!estructuraCategoria.isCalculated) {
      for (const [cuentaTx, montoTx] of transaccionesPorCuenta.entries()) {
        // Si ya fue mapeada, skip
        if (cuentasMapeadas.has(cuentaTx)) continue;
        
        // Clasificar la cuenta
        const categoriaClasificada = clasificarCuenta(cuentaTx);
        
        // Si pertenece a esta categoría, agregarla
        if (categoriaClasificada === estructuraCategoria.name) {
          const row: EERRRow = { Item: cuentaTx };
          
          row[`${mesNombre} Monto`] = montoTx;
          row[`${mesNombre} %`] = 0;
          row['CONSOLIDADO Monto'] = montoTx;
          row['CONSOLIDADO %'] = 0;
          row['CONSOLIDADO Promedio'] = montoTx;
          
          rows.push(row);
          cuentasMapeadas.add(cuentaTx);
        }
      }
    }
    
    // Calcular total de categoría o MARGEN BRUTO OPERACIONAL
    let totalRow: EERRRow | undefined;
    
    if (estructuraCategoria.hasMargenBruto) {
      // Calcular MARGEN BRUTO OPERACIONAL
      // Fórmula: Ventas - Costo de venta + Bonificacion por tramo - Transbank
      const ventasRow = rows.find(r => r.Item === 'Ventas');
      const costoVentaRow = rows.find(r => r.Item === 'Costo de venta');
      const transbankRow = rows.find(r => r.Item === 'Transbank');
      const bonificacionRow = rows.find(r => r.Item === 'Bonificacion por tramo');
      
      const ventasMonto = ventasRow?.[`${mesNombre} Monto`];
      const costoVentaMonto = costoVentaRow?.[`${mesNombre} Monto`];
      const transbankMonto = transbankRow?.[`${mesNombre} Monto`];
      const bonificacionMonto = bonificacionRow?.[`${mesNombre} Monto`];
      
      const ventas = typeof ventasMonto === 'number' ? ventasMonto : 0;
      const costoVenta = typeof costoVentaMonto === 'number' ? costoVentaMonto : 0;
      const transbank = typeof transbankMonto === 'number' ? transbankMonto : 0;
      const bonificacion = typeof bonificacionMonto === 'number' ? bonificacionMonto : 0;
      
      const margenBrutoMonto = ventas - costoVenta + bonificacion - transbank;
      
      totalRow = { Item: 'MARGEN BRUTO OPERACIONAL' };
      totalRow[`${mesNombre} Monto`] = margenBrutoMonto;
      totalRow[`${mesNombre} %`] = 0; // Se calcula después
      totalRow['CONSOLIDADO Monto'] = margenBrutoMonto;
      totalRow['CONSOLIDADO %'] = 0; // Se calcula después
      totalRow['CONSOLIDADO Promedio'] = margenBrutoMonto;
      
    } else if (!estructuraCategoria.isCalculated) {
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
    } else if (estructuraCategoria.name === 'EBIDTA') {
      // Calcular EBITDA después de que todas las categorías estén construidas
      // Se calculará al final
    }
    
    categories.push({
      name: estructuraCategoria.name,
      rows,
      total: totalRow
    });
  });
  
  // Calcular EBITDA: MARGEN BRUTO - TOTAL GASTOS REMUNERACION - TOTAL GASTOS OPERACION - TOTAL GASTOS ADMIN - TOTAL OTROS GASTOS
  const ebitdaCategory = categories.find(cat => cat.name === 'EBIDTA');
  if (ebitdaCategory) {
    const margenBrutoCategory = categories.find(cat => cat.name === 'INGRESOS OPERACIONALES');
    const gastosRemuneracionCategory = categories.find(cat => cat.name === 'GASTOS DE REMUNERACION');
    const gastosOperacionCategory = categories.find(cat => cat.name === 'GASTOS DE OPERACION');
    const gastosAdminCategory = categories.find(cat => cat.name === 'GASTOS DE ADMINISTRACION');
    const otrosGastosCategory = categories.find(cat => cat.name === 'OTROS GASTOS');
    
    const margenBrutoMonto = margenBrutoCategory?.total?.[`${mesNombre} Monto`];
    const gastosRemuneracionMonto = gastosRemuneracionCategory?.total?.[`${mesNombre} Monto`];
    const gastosOperacionMonto = gastosOperacionCategory?.total?.[`${mesNombre} Monto`];
    const gastosAdminMonto = gastosAdminCategory?.total?.[`${mesNombre} Monto`];
    const otrosGastosMonto = otrosGastosCategory?.total?.[`${mesNombre} Monto`];
    
    const margenBruto = typeof margenBrutoMonto === 'number' ? margenBrutoMonto : 0;
    const gastosRemuneracion = typeof gastosRemuneracionMonto === 'number' ? gastosRemuneracionMonto : 0;
    const gastosOperacion = typeof gastosOperacionMonto === 'number' ? gastosOperacionMonto : 0;
    const gastosAdmin = typeof gastosAdminMonto === 'number' ? gastosAdminMonto : 0;
    const otrosGastos = typeof otrosGastosMonto === 'number' ? otrosGastosMonto : 0;
    
    const ebitdaMonto = margenBruto - gastosRemuneracion - gastosOperacion - gastosAdmin - otrosGastos;
    
    const ebitdaRow: EERRRow = { Item: 'EBIDTA' };
    ebitdaRow[`${mesNombre} Monto`] = ebitdaMonto;
    ebitdaRow[`${mesNombre} %`] = 0; // Se calcula después
    ebitdaRow['CONSOLIDADO Monto'] = ebitdaMonto;
    ebitdaRow['CONSOLIDADO %'] = 0; // Se calcula después
    ebitdaRow['CONSOLIDADO Promedio'] = ebitdaMonto;
    
    ebitdaCategory.rows = [ebitdaRow];
  }
  
  // Calcular RESULTADO NETO: MARGEN BRUTO - TOTAL GASTOS REMUNERACION - TOTAL GASTOS OPERACION - TOTAL GASTOS ADMIN - TOTAL OTROS GASTOS - OTROS EGRESOS
  const resultadoNetoCategory = categories.find(cat => cat.name === 'RESULTADO NETO');
  if (resultadoNetoCategory) {
    const margenBrutoCategory = categories.find(cat => cat.name === 'INGRESOS OPERACIONALES');
    const gastosRemuneracionCategory = categories.find(cat => cat.name === 'GASTOS DE REMUNERACION');
    const gastosOperacionCategory = categories.find(cat => cat.name === 'GASTOS DE OPERACION');
    const gastosAdminCategory = categories.find(cat => cat.name === 'GASTOS DE ADMINISTRACION');
    const otrosGastosCategory = categories.find(cat => cat.name === 'OTROS GASTOS');
    const otrosEgresosCategory = categories.find(cat => cat.name === 'OTROS EGRESOS FUERA DE EXPLOTACION');
    
    const margenBrutoMonto = margenBrutoCategory?.total?.[`${mesNombre} Monto`];
    const gastosRemuneracionMonto = gastosRemuneracionCategory?.total?.[`${mesNombre} Monto`];
    const gastosOperacionMonto = gastosOperacionCategory?.total?.[`${mesNombre} Monto`];
    const gastosAdminMonto = gastosAdminCategory?.total?.[`${mesNombre} Monto`];
    const otrosGastosMonto = otrosGastosCategory?.total?.[`${mesNombre} Monto`];
    const otrosEgresosMonto = otrosEgresosCategory?.total?.[`${mesNombre} Monto`];
    
    const margenBruto = typeof margenBrutoMonto === 'number' ? margenBrutoMonto : 0;
    const gastosRemuneracion = typeof gastosRemuneracionMonto === 'number' ? gastosRemuneracionMonto : 0;
    const gastosOperacion = typeof gastosOperacionMonto === 'number' ? gastosOperacionMonto : 0;
    const gastosAdmin = typeof gastosAdminMonto === 'number' ? gastosAdminMonto : 0;
    const otrosGastos = typeof otrosGastosMonto === 'number' ? otrosGastosMonto : 0;
    const otrosEgresos = typeof otrosEgresosMonto === 'number' ? otrosEgresosMonto : 0;
    
    const resultadoNetoMonto = margenBruto - gastosRemuneracion - gastosOperacion - gastosAdmin - otrosGastos - otrosEgresos;
    
    const resultadoNetoRow: EERRRow = { Item: 'RESULTADO NETO' };
    resultadoNetoRow[`${mesNombre} Monto`] = resultadoNetoMonto;
    resultadoNetoRow[`${mesNombre} %`] = 0; // Se calcula después
    resultadoNetoRow['CONSOLIDADO Monto'] = resultadoNetoMonto;
    resultadoNetoRow['CONSOLIDADO %'] = 0; // Se calcula después
    resultadoNetoRow['CONSOLIDADO Promedio'] = resultadoNetoMonto;
    
    resultadoNetoCategory.rows = [resultadoNetoRow];
  }
  
  // Calcular porcentajes basados en Ventas
  // Ventas = 100%, todas las demás cuentas se calculan como: (monto / ventas) * 100
  let montoVentas = 0;
  
  // Buscar el monto de Ventas
  categories.forEach(cat => {
    const ventasRow = cat.rows.find(r => r.Item === 'Ventas');
    if (ventasRow) {
      const montoVentasMes = ventasRow[`${mesNombre} Monto`];
      montoVentas = typeof montoVentasMes === 'number' ? montoVentasMes : 0;
    }
  });
  
  // Si hay ventas, calcular porcentajes
  if (montoVentas > 0) {
    categories.forEach(cat => {
      // Calcular % para cada fila
      cat.rows.forEach(row => {
        const montoMes = row[`${mesNombre} Monto`];
        const montoConsolidado = row['CONSOLIDADO Monto'];
        
        if (typeof montoMes === 'number' && typeof montoConsolidado === 'number') {
          const porcentajeMes = (montoMes / montoVentas) * 100;
          const porcentajeConsolidado = (montoConsolidado / montoVentas) * 100;
          
          row[`${mesNombre} %`] = porcentajeMes;
          row['CONSOLIDADO %'] = porcentajeConsolidado;
        }
      });
      
      // Calcular % para total de categoría (incluye MARGEN BRUTO OPERACIONAL)
      if (cat.total) {
        const totalMontoMes = cat.total[`${mesNombre} Monto`];
        const totalMontoConsolidado = cat.total['CONSOLIDADO Monto'];
        
        if (typeof totalMontoMes === 'number' && typeof totalMontoConsolidado === 'number') {
          // Para MARGEN BRUTO OPERACIONAL: % = (margenBruto / ventas) * 100
          cat.total[`${mesNombre} %`] = (totalMontoMes / montoVentas) * 100;
          cat.total['CONSOLIDADO %'] = (totalMontoConsolidado / montoVentas) * 100;
        }
      }
    });
  }
  
  return {
    sheetName: `Libro de Compras - ${periodo}`,
    months: allMonths,
    categories
  };
}

/**
 * Convierte múltiples períodos de transacciones de Libro de Compras a formato EERRData consolidado
 * manteniendo la estructura predefinida y mostrando columnas por cada mes.
 * 
 * @param documentos - Array de documentos de Libro de Compras, cada uno con su período
 * @param valoresManuales - Valores manuales opcionales (ej: Ventas por período)
 * @returns Estructura EERRData con columnas para cada mes + ANUAL
 */
export function aggregateMultiplePeriodsToEERR(
  documentos: Array<{
    periodo: string;
    transacciones: LibroComprasTransaction[];
    valoresManuales?: { [cuenta: string]: number };
  }>
): EERRData {
  // Ordenar documentos por período para tener meses en orden cronológico
  const docsOrdenados = [...documentos].sort((a, b) => a.periodo.localeCompare(b.periodo));
  
  // Extraer nombres de meses de cada período
  const monthNames = docsOrdenados.map(doc => {
    const [, mesStr] = doc.periodo.split('-');
    const periodoMes = parseInt(mesStr);
    return MESES[periodoMes - 1];
  });
  
  // Agregar ANUAL al final
  const allMonths = [...monthNames, 'ANUAL'];
  
  // Procesar cada documento para agrupar transacciones por cuenta y período
  const transaccionesPorPeriodo = new Map<string, Map<string, number>>();
  
  docsOrdenados.forEach((doc, periodoIdx) => {
    const mesNombre = monthNames[periodoIdx];
    const mapPeriodo = new Map<string, number>();
    
    doc.transacciones.forEach(tx => {
      const cuenta = (tx.cuenta || 'Sin Clasificar').trim();
      const monto = tx.montoTotal || 0;
      
      const montoActual = mapPeriodo.get(cuenta) || 0;
      mapPeriodo.set(cuenta, montoActual + monto);
    });
    
    transaccionesPorPeriodo.set(mesNombre, mapPeriodo);
  });
  
  // Rastrear qué cuentas del LC ya fueron mapeadas
  const cuentasMapeadas = new Set<string>();
  
  // Construir categorías con estructura predefinida
  const categories: EERRCategory[] = [];
  
  ESTRUCTURA_EERR.forEach(estructuraCategoria => {
    const rows: EERRRow[] = [];
    
    // Agregar items predefinidos de la categoría
    estructuraCategoria.items.forEach(itemName => {
      const row: EERRRow = { Item: itemName };
      let totalAnual = 0;
      let countMeses = 0;
      
      // Agregar valores por cada mes
      docsOrdenados.forEach((doc, periodoIdx) => {
        const mesNombre = monthNames[periodoIdx];
        const valoresManuales = doc.valoresManuales || {};
        const mapPeriodo = transaccionesPorPeriodo.get(mesNombre);
        
        // Primero verificar si hay valor manual para esta cuenta en este período
        let monto = valoresManuales[itemName] || 0;
        
        // Si no hay valor manual, buscar en transacciones del LC de este período
        if (monto === 0 && mapPeriodo) {
          const itemNormalizado = itemName.toLowerCase().trim();
          
          for (const [cuentaTx, montoTx] of mapPeriodo.entries()) {
            const cuentaNormalizada = cuentaTx.toLowerCase().trim();
            
            // Match exacto o case-insensitive
            if (cuentaTx === itemName || cuentaNormalizada === itemNormalizado) {
              monto = montoTx;
              cuentasMapeadas.add(`${mesNombre}:${cuentaTx}`);
              break;
            }
          }
        }
        
        row[`${mesNombre} Monto`] = monto;
        row[`${mesNombre} %`] = 0; // Se calcula después basado en Ventas
        
        totalAnual += monto;
        countMeses++;
      });
      
      // ANUAL
      row['ANUAL Monto'] = totalAnual;
      row['ANUAL %'] = 0; // Se calcula después basado en Ventas
      row['ANUAL Promedio'] = countMeses > 0 ? totalAnual / countMeses : 0;
      
      rows.push(row);
    });
    
    // Agregar cuentas adicionales del LC que pertenecen a esta categoría
    if (!estructuraCategoria.isCalculated) {
      // Recolectar todas las cuentas únicas de todos los períodos
      const cuentasUnicas = new Set<string>();
      transaccionesPorPeriodo.forEach(mapPeriodo => {
        mapPeriodo.forEach((_, cuenta) => {
          cuentasUnicas.add(cuenta);
        });
      });
      
      cuentasUnicas.forEach(cuentaTx => {
        // Verificar si ya fue mapeada en algún período
        const yaMapeada = monthNames.some(mes => cuentasMapeadas.has(`${mes}:${cuentaTx}`));
        if (yaMapeada) return;
        
        // Clasificar la cuenta
        const categoriaClasificada = clasificarCuenta(cuentaTx);
        
        // Si pertenece a esta categoría, agregarla
        if (categoriaClasificada === estructuraCategoria.name) {
          const row: EERRRow = { Item: cuentaTx };
          let totalAnual = 0;
          let countMeses = 0;
          
          // Agregar valores por cada mes
          monthNames.forEach(mesNombre => {
            const mapPeriodo = transaccionesPorPeriodo.get(mesNombre);
            const monto = mapPeriodo?.get(cuentaTx) || 0;
            
            row[`${mesNombre} Monto`] = monto;
            row[`${mesNombre} %`] = 0;
            
            totalAnual += monto;
            countMeses++;
            cuentasMapeadas.add(`${mesNombre}:${cuentaTx}`);
          });
          
          row['ANUAL Monto'] = totalAnual;
          row['ANUAL %'] = 0;
          row['ANUAL Promedio'] = countMeses > 0 ? totalAnual / countMeses : 0;
          
          rows.push(row);
        }
      });
    }
    
    // Calcular total de categoría o MARGEN BRUTO OPERACIONAL
    let totalRow: EERRRow | undefined;
    
    if (estructuraCategoria.hasMargenBruto) {
      // Calcular MARGEN BRUTO OPERACIONAL por mes
      const ventasRow = rows.find(r => r.Item === 'Ventas');
      const costoVentaRow = rows.find(r => r.Item === 'Costo de venta');
      const transbankRow = rows.find(r => r.Item === 'Transbank');
      const bonificacionRow = rows.find(r => r.Item === 'Bonificacion por tramo');
      
      totalRow = { Item: 'MARGEN BRUTO OPERACIONAL' };
      let totalAnualMargen = 0;
      let countMeses = 0;
      
      monthNames.forEach(mesNombre => {
        const ventasMonto = ventasRow?.[`${mesNombre} Monto`];
        const costoVentaMonto = costoVentaRow?.[`${mesNombre} Monto`];
        const transbankMonto = transbankRow?.[`${mesNombre} Monto`];
        const bonificacionMonto = bonificacionRow?.[`${mesNombre} Monto`];
        
        const ventas = typeof ventasMonto === 'number' ? ventasMonto : 0;
        const costoVenta = typeof costoVentaMonto === 'number' ? costoVentaMonto : 0;
        const transbank = typeof transbankMonto === 'number' ? transbankMonto : 0;
        const bonificacion = typeof bonificacionMonto === 'number' ? bonificacionMonto : 0;
        
        const margenBrutoMonto = ventas - costoVenta + bonificacion - transbank;
        
        if (totalRow) {
          totalRow[`${mesNombre} Monto`] = margenBrutoMonto;
          totalRow[`${mesNombre} %`] = 0;
        }
        
        totalAnualMargen += margenBrutoMonto;
        countMeses++;
      });
      
      totalRow['ANUAL Monto'] = totalAnualMargen;
      totalRow['ANUAL %'] = 0;
      totalRow['ANUAL Promedio'] = countMeses > 0 ? totalAnualMargen / countMeses : 0;
      
    } else if (!estructuraCategoria.isCalculated) {
      totalRow = { Item: `TOTAL ${estructuraCategoria.name}` };
      let totalAnualCategoria = 0;
      let countMeses = 0;
      
      monthNames.forEach(mesNombre => {
        const totalMonto = rows.reduce((sum, row) => {
          const valorMonto = row[`${mesNombre} Monto`];
          return sum + (typeof valorMonto === 'number' ? valorMonto : 0);
        }, 0);
        
        totalRow![`${mesNombre} Monto`] = totalMonto;
        totalRow![`${mesNombre} %`] = 0;
        
        totalAnualCategoria += totalMonto;
        countMeses++;
      });
      
      totalRow['ANUAL Monto'] = totalAnualCategoria;
      totalRow['ANUAL %'] = 0;
      totalRow['ANUAL Promedio'] = countMeses > 0 ? totalAnualCategoria / countMeses : 0;
    }
    
    categories.push({
      name: estructuraCategoria.name,
      rows,
      total: totalRow
    });
  });
  
  // Calcular EBITDA: MARGEN BRUTO - TOTAL GASTOS (todas las categorías de gastos)
  const ebitdaCategory = categories.find(cat => cat.name === 'EBIDTA');
  if (ebitdaCategory) {
    const margenBrutoCategory = categories.find(cat => cat.name === 'INGRESOS OPERACIONALES');
    const gastosRemuneracionCategory = categories.find(cat => cat.name === 'GASTOS DE REMUNERACION');
    const gastosOperacionCategory = categories.find(cat => cat.name === 'GASTOS DE OPERACION');
    const gastosAdminCategory = categories.find(cat => cat.name === 'GASTOS DE ADMINISTRACION');
    const otrosGastosCategory = categories.find(cat => cat.name === 'OTROS GASTOS');
    
    const ebitdaRow: EERRRow = { Item: 'EBIDTA' };
    let totalAnualEbitda = 0;
    let countMeses = 0;
    
    monthNames.forEach(mesNombre => {
      const margenBrutoMonto = margenBrutoCategory?.total?.[`${mesNombre} Monto`];
      const gastosRemuneracionMonto = gastosRemuneracionCategory?.total?.[`${mesNombre} Monto`];
      const gastosOperacionMonto = gastosOperacionCategory?.total?.[`${mesNombre} Monto`];
      const gastosAdminMonto = gastosAdminCategory?.total?.[`${mesNombre} Monto`];
      const otrosGastosMonto = otrosGastosCategory?.total?.[`${mesNombre} Monto`];
      
      const margenBruto = typeof margenBrutoMonto === 'number' ? margenBrutoMonto : 0;
      const gastosRemuneracion = typeof gastosRemuneracionMonto === 'number' ? gastosRemuneracionMonto : 0;
      const gastosOperacion = typeof gastosOperacionMonto === 'number' ? gastosOperacionMonto : 0;
      const gastosAdmin = typeof gastosAdminMonto === 'number' ? gastosAdminMonto : 0;
      const otrosGastos = typeof otrosGastosMonto === 'number' ? otrosGastosMonto : 0;
      
      const ebitdaMonto = margenBruto - gastosRemuneracion - gastosOperacion - gastosAdmin - otrosGastos;
      
      ebitdaRow[`${mesNombre} Monto`] = ebitdaMonto;
      ebitdaRow[`${mesNombre} %`] = 0;
      
      totalAnualEbitda += ebitdaMonto;
      countMeses++;
    });
    
    ebitdaRow['ANUAL Monto'] = totalAnualEbitda;
    ebitdaRow['ANUAL %'] = 0;
    ebitdaRow['ANUAL Promedio'] = countMeses > 0 ? totalAnualEbitda / countMeses : 0;
    
    ebitdaCategory.rows = [ebitdaRow];
  }
  
  // Calcular RESULTADO NETO: MARGEN BRUTO - todos los gastos - OTROS EGRESOS
  const resultadoNetoCategory = categories.find(cat => cat.name === 'RESULTADO NETO');
  if (resultadoNetoCategory) {
    const margenBrutoCategory = categories.find(cat => cat.name === 'INGRESOS OPERACIONALES');
    const gastosRemuneracionCategory = categories.find(cat => cat.name === 'GASTOS DE REMUNERACION');
    const gastosOperacionCategory = categories.find(cat => cat.name === 'GASTOS DE OPERACION');
    const gastosAdminCategory = categories.find(cat => cat.name === 'GASTOS DE ADMINISTRACION');
    const otrosGastosCategory = categories.find(cat => cat.name === 'OTROS GASTOS');
    const otrosEgresosCategory = categories.find(cat => cat.name === 'OTROS EGRESOS FUERA DE EXPLOTACION');
    
    const resultadoNetoRow: EERRRow = { Item: 'RESULTADO NETO' };
    let totalAnualResultado = 0;
    let countMeses = 0;
    
    monthNames.forEach(mesNombre => {
      const margenBrutoMonto = margenBrutoCategory?.total?.[`${mesNombre} Monto`];
      const gastosRemuneracionMonto = gastosRemuneracionCategory?.total?.[`${mesNombre} Monto`];
      const gastosOperacionMonto = gastosOperacionCategory?.total?.[`${mesNombre} Monto`];
      const gastosAdminMonto = gastosAdminCategory?.total?.[`${mesNombre} Monto`];
      const otrosGastosMonto = otrosGastosCategory?.total?.[`${mesNombre} Monto`];
      const otrosEgresosMonto = otrosEgresosCategory?.total?.[`${mesNombre} Monto`];
      
      const margenBruto = typeof margenBrutoMonto === 'number' ? margenBrutoMonto : 0;
      const gastosRemuneracion = typeof gastosRemuneracionMonto === 'number' ? gastosRemuneracionMonto : 0;
      const gastosOperacion = typeof gastosOperacionMonto === 'number' ? gastosOperacionMonto : 0;
      const gastosAdmin = typeof gastosAdminMonto === 'number' ? gastosAdminMonto : 0;
      const otrosGastos = typeof otrosGastosMonto === 'number' ? otrosGastosMonto : 0;
      const otrosEgresos = typeof otrosEgresosMonto === 'number' ? otrosEgresosMonto : 0;
      
      const resultadoNetoMonto = margenBruto - gastosRemuneracion - gastosOperacion - gastosAdmin - otrosGastos - otrosEgresos;
      
      resultadoNetoRow[`${mesNombre} Monto`] = resultadoNetoMonto;
      resultadoNetoRow[`${mesNombre} %`] = 0;
      
      totalAnualResultado += resultadoNetoMonto;
      countMeses++;
    });
    
    resultadoNetoRow['ANUAL Monto'] = totalAnualResultado;
    resultadoNetoRow['ANUAL %'] = 0;
    resultadoNetoRow['ANUAL Promedio'] = countMeses > 0 ? totalAnualResultado / countMeses : 0;
    
    resultadoNetoCategory.rows = [resultadoNetoRow];
  }
  
  // Calcular porcentajes basados en Ventas de cada mes y ANUAL
  categories.forEach(cat => {
    const ventasRow = cat.rows.find(r => r.Item === 'Ventas');
    
    // Calcular % para cada mes
    monthNames.forEach(mesNombre => {
      const montoVentasMes = ventasRow?.[`${mesNombre} Monto`];
      const montoVentas = typeof montoVentasMes === 'number' ? montoVentasMes : 0;
      
      if (montoVentas > 0) {
        // Calcular % para cada fila
        cat.rows.forEach(row => {
          const montoMes = row[`${mesNombre} Monto`];
          if (typeof montoMes === 'number') {
            row[`${mesNombre} %`] = (montoMes / montoVentas) * 100;
          }
        });
        
        // Calcular % para total de categoría
        if (cat.total) {
          const totalMontoMes = cat.total[`${mesNombre} Monto`];
          if (typeof totalMontoMes === 'number') {
            cat.total[`${mesNombre} %`] = (totalMontoMes / montoVentas) * 100;
          }
        }
      }
    });
    
    // Calcular % ANUAL
    const montoVentasAnual = ventasRow?.['ANUAL Monto'];
    const montoVentasAnualNum = typeof montoVentasAnual === 'number' ? montoVentasAnual : 0;
    
    if (montoVentasAnualNum > 0) {
      cat.rows.forEach(row => {
        const montoAnual = row['ANUAL Monto'];
        if (typeof montoAnual === 'number') {
          row['ANUAL %'] = (montoAnual / montoVentasAnualNum) * 100;
        }
      });
      
      if (cat.total) {
        const totalMontoAnual = cat.total['ANUAL Monto'];
        if (typeof totalMontoAnual === 'number') {
          cat.total['ANUAL %'] = (totalMontoAnual / montoVentasAnualNum) * 100;
        }
      }
    }
  });
  
  // Determinar sheetName basado en períodos
  const firstPeriodo = docsOrdenados[0]?.periodo || '';
  const lastPeriodo = docsOrdenados[docsOrdenados.length - 1]?.periodo || '';
  const sheetName = docsOrdenados.length === 1
    ? `Libro de Compras - ${firstPeriodo}`
    : `Libro de Compras - ${firstPeriodo} a ${lastPeriodo}`;
  
  // Crear mapeo de nombre de mes a período (ej: "Agosto" → "2024-08")
  const monthToPeriod: { [monthName: string]: string } = {};
  docsOrdenados.forEach((doc, idx) => {
    const mesNombre = monthNames[idx];
    monthToPeriod[mesNombre] = doc.periodo;
  });
  
  return {
    sheetName,
    months: allMonths,
    categories,
    monthToPeriod
  };
}
