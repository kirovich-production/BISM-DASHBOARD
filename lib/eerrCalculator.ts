import { EERRData, EERRCategory, EERRRow, LibroComprasTransaction } from '@/types';
import { ENCABEZADOS_EERR } from './encabezadosEERR';
import { obtenerCuentasPorEncabezado } from './cuentasEncabezados';

/**
 * Genera EERR automáticamente desde transacciones del Libro de Compras
 * Usa la columna montoNeto como fuente de datos
 */
export function generateEERRFromLibroCompras(
  transactions: LibroComprasTransaction[],
  sucursal: string
): EERRData | null {
  
  if (!transactions || transactions.length === 0) {
    console.warn(`[generateEERR] No hay transacciones para ${sucursal}`);
    return null;
  }

  // Filtrar transacciones por sucursal
  const sucursalTransactions = transactions.filter(t => 
    t.unidadNegocio?.toLowerCase() === sucursal.toLowerCase() ||
    t.razonSocial?.toLowerCase().includes(sucursal.toLowerCase())
  );

  if (sucursalTransactions.length === 0) {
    console.warn(`[generateEERR] No hay transacciones para sucursal ${sucursal}`);
    return null;
  }

  // Estructura de agrupación: encabezado -> cuenta -> mes -> suma montoNeto
  const agrupado: Map<string, Map<string, Map<string, number>>> = new Map();
  const mesesSet = new Set<string>();

  // Procesar cada transacción
  sucursalTransactions.forEach(trans => {
    const encabezado = trans.encabezado || 'SIN CLASIFICAR';
    const cuenta = trans.cuenta || 'Sin cuenta';
    const montoNeto = trans.montoNeto || 0;
    
    // Extraer mes de fechaDocto
    const fechaStr = typeof trans.fechaDocto === 'string' ? trans.fechaDocto : trans.fechaDocto?.toISOString();
    const mes = extraerMes(fechaStr);
    if (!mes) return;
    
    mesesSet.add(mes);

    // Agrupar
    if (!agrupado.has(encabezado)) {
      agrupado.set(encabezado, new Map());
    }
    const cuentasMap = agrupado.get(encabezado)!;
    
    if (!cuentasMap.has(cuenta)) {
      cuentasMap.set(cuenta, new Map());
    }
    const mesesMap = cuentasMap.get(cuenta)!;
    
    const montoActual = mesesMap.get(mes) || 0;
    mesesMap.set(mes, montoActual + montoNeto);
  });

  // Ordenar meses cronológicamente
  const meses = Array.from(mesesSet).sort((a, b) => {
    const mesesOrden = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 
                        'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return mesesOrden.indexOf(a) - mesesOrden.indexOf(b);
  });

  // Calcular totales por mes (para calcular %)
  const totalesPorMes = new Map<string, number>();
  const ingresosOperacionalesPorMes = new Map<string, number>();
  
  agrupado.forEach((cuentasMap, encabezado) => {
    cuentasMap.forEach((mesesMap) => {
      mesesMap.forEach((monto, mes) => {
        if (encabezado === 'INGRESOS OPERACIONALES') {
          const ingresoActual = ingresosOperacionalesPorMes.get(mes) || 0;
          ingresosOperacionalesPorMes.set(mes, ingresoActual + monto);
        }
        const totalActual = totalesPorMes.get(mes) || 0;
        totalesPorMes.set(mes, totalActual + monto);
      });
    });
  });

  // Construir categorías en orden de ENCABEZADOS_EERR
  const categories: EERRCategory[] = [];
  
  ENCABEZADOS_EERR.forEach(encabezadoName => {
    const cuentasMap = agrupado.get(encabezadoName);
    if (!cuentasMap || cuentasMap.size === 0) return;

    const rows: EERRRow[] = [];
    const totalPorMes: Map<string, number> = new Map();

    // Obtener cuentas esperadas para este encabezado
    const cuentasEsperadas = obtenerCuentasPorEncabezado(encabezadoName);
    
    // Primero agregar cuentas en orden esperado
    cuentasEsperadas.forEach(cuentaEsperada => {
      const mesesMap = cuentasMap.get(cuentaEsperada);
      if (mesesMap) {
        const row = construirRow(cuentaEsperada, mesesMap, meses, ingresosOperacionalesPorMes);
        rows.push(row);
        
        // Acumular para total
        mesesMap.forEach((monto, mes) => {
          const totalActual = totalPorMes.get(mes) || 0;
          totalPorMes.set(mes, totalActual + monto);
        });
      }
    });

    // Luego agregar cuentas no esperadas (que aparecen en LC pero no están mapeadas)
    cuentasMap.forEach((mesesMap, _cuenta) => {
      if (!cuentasEsperadas.includes(_cuenta)) {
        const row = construirRow(_cuenta, mesesMap, meses, ingresosOperacionalesPorMes);
        rows.push(row);
        
        // Acumular para total
        mesesMap.forEach((monto, mes) => {
          const totalActual = totalPorMes.get(mes) || 0;
          totalPorMes.set(mes, totalActual + monto);
        });
      }
    });

    // Construir fila de total
    const totalRow = construirTotalRow(encabezadoName, totalPorMes, meses, ingresosOperacionalesPorMes);

    categories.push({
      name: encabezadoName,
      rows,
      total: totalRow
    });
  });

  // Agregar categoría "SIN CLASIFICAR" si existen
  const sinClasificar = agrupado.get('SIN CLASIFICAR');
  if (sinClasificar && sinClasificar.size > 0) {
    const rows: EERRRow[] = [];
    const totalPorMes: Map<string, number> = new Map();

    sinClasificar.forEach((mesesMap, cuenta) => {
      const row = construirRow(cuenta, mesesMap, meses, ingresosOperacionalesPorMes);
      rows.push(row);
      
      mesesMap.forEach((monto, mes) => {
        const totalActual = totalPorMes.get(mes) || 0;
        totalPorMes.set(mes, totalActual + monto);
      });
    });

    const totalRow = construirTotalRow('SIN CLASIFICAR', totalPorMes, meses, ingresosOperacionalesPorMes);

    categories.push({
      name: 'SIN CLASIFICAR',
      rows,
      total: totalRow
    });
  }

  return { 
    sheetName: sucursal,
    months: meses,
    categories 
  };
}

/**
 * Extrae el nombre del mes de una fecha
 */
function extraerMes(fecha: string | undefined): string | null {
  if (!fecha) return null;
  
  try {
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return null;
    
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 
                   'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return meses[date.getMonth()];
  } catch {
    return null;
  }
}

/**
 * Construye una fila de datos con Monto, % y Promedio
 */
function construirRow(
  cuenta: string,
  mesesMap: Map<string, number>,
  meses: string[],
  ingresosOperacionalesPorMes: Map<string, number>
): EERRRow {
  const row: EERRRow = { Item: cuenta };
  
  let sumaTotal = 0;
  let cantidadMeses = 0;

  meses.forEach(mes => {
    const monto = mesesMap.get(mes) || 0;
    row[`${mes} Monto`] = monto;
    
    // Calcular %
    const ingresoOperacional = ingresosOperacionalesPorMes.get(mes) || 1;
    const porcentaje = ingresoOperacional !== 0 ? (monto / ingresoOperacional) * 100 : 0;
    row[`${mes} %`] = parseFloat(porcentaje.toFixed(2));
    
    sumaTotal += monto;
    if (monto !== 0) cantidadMeses++;
  });

  // Calcular promedio
  const promedio = cantidadMeses > 0 ? sumaTotal / meses.length : 0;
  row['Promedio'] = parseFloat(promedio.toFixed(2));

  return row;
}

/**
 * Construye fila de total para una categoría
 */
function construirTotalRow(
  encabezado: string,
  totalPorMes: Map<string, number>,
  meses: string[],
  ingresosOperacionalesPorMes: Map<string, number>
): EERRRow {
  const totalRow: EERRRow = { Item: `TOTAL ${encabezado}` };
  
  let sumaTotal = 0;

  meses.forEach(mes => {
    const monto = totalPorMes.get(mes) || 0;
    totalRow[`${mes} Monto`] = monto;
    
    // Calcular %
    const ingresoOperacional = ingresosOperacionalesPorMes.get(mes) || 1;
    const porcentaje = ingresoOperacional !== 0 ? (monto / ingresoOperacional) * 100 : 0;
    totalRow[`${mes} %`] = parseFloat(porcentaje.toFixed(2));
    
    sumaTotal += monto;
  });

  // Calcular promedio
  const promedio = meses.length > 0 ? sumaTotal / meses.length : 0;
  totalRow['Promedio'] = parseFloat(promedio.toFixed(2));

  return totalRow;
}
