import * as XLSX from 'xlsx';
import { EERRData, EERRCategory, EERRRow, ExcelSection, ExcelRow } from '@/types';

/**
 * Parser para hojas EERR (Estado de Resultados)
 * Lee hojas con formato: EERR SEVILLA, EERR LABRANZA
 */
export function parseEERR(workbook: XLSX.WorkBook, sheetName: string): EERRData | null {
  
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    console.error(`[parseEERR] ❌ Hoja "${sheetName}" NO encontrada`);
    // Intentar buscar una hoja similar
    const similarSheet = workbook.SheetNames.find(name => 
      name.toLowerCase().includes(sheetName.toLowerCase().replace('eerr ', ''))
    );
    if (similarSheet) {
    }
    return null;
  }


  // Convertir a array de arrays
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  }) as unknown[][];


  // ========================================
  // PASO 1: DETECCIÓN AUTOMÁTICA DE ESTRUCTURA
  // ========================================
  let monthsRowIndex = -1;
  let subHeaderRowIndex = -1;
  let dataStartRowIndex = -1;

  // Buscar la fila que contiene los meses (ENERO, FEBRERO, etc.)
  for (let i = 0; i < Math.min(15, rawData.length); i++) {
    const row = rawData[i] as string[];
    const rowText = row.map(cell => String(cell || '').toUpperCase().trim()).join(' ');
    
    if (rowText.includes('ENERO') && rowText.includes('FEBRERO')) {
      monthsRowIndex = i;
      subHeaderRowIndex = i + 1;
      dataStartRowIndex = i + 1; // ✅ CORREGIDO: Los datos (incluyendo headers de categorías) empiezan justo después de meses
      break;
    }
  }

  if (monthsRowIndex === -1) {
    console.error(`[parseEERR] ❌ No se detectó la fila de meses`);
    return null;
  }

  // ========================================
  // PASO 2: EXTRAER MESES
  // ========================================
  const monthsRow = rawData[monthsRowIndex] as string[];
  const months: string[] = [];
  const monthIndices: number[] = [];

  for (let i = 0; i < monthsRow.length; i++) {
    const cell = String(monthsRow[i] || '').trim().toUpperCase();
    if (cell && !cell.includes('MONTO') && !cell.includes('%') && !cell.includes('PROMEDIO')) {
      months.push(cell);
      monthIndices.push(i);
    }
  }


  // ========================================
  // PASO 3: CONSTRUIR HEADERS DINÁMICOS CON MAPEO DE COLUMNAS
  // ========================================
  const headers: string[] = ['Item'];
  const columnMapping: { [header: string]: number } = { 'Item': 0 };
  const headerRow = rawData[monthsRowIndex];
  const subHeaderRow = rawData[subHeaderRowIndex];

  let currentMonth = '';
  for (let i = 1; i < headerRow.length; i++) {
    const monthVal = String(headerRow[i] || '').trim();
    const subVal = String(subHeaderRow[i] || '').trim().toLowerCase();
    
    // Solo actualizar currentMonth si hay un valor nuevo (para manejar celdas fusionadas)
    // 🔧 NORMALIZAR A MAYÚSCULAS para que coincida con el array months
    if (monthVal && monthVal !== '') {
      currentMonth = monthVal.toUpperCase();
    }
    
    if (currentMonth) {
      let headerName = '';
      if (subVal.includes('monto') || subVal === 'monto') {
        headerName = `${currentMonth} Monto`;
      } else if (subVal === '%' || subVal.includes('%')) {
        headerName = `${currentMonth} %`;
      } else if (subVal.includes('promedio')) {
        headerName = `${currentMonth} Promedio`;
      }
      
      if (headerName) {
        headers.push(headerName);
        columnMapping[headerName] = i; // 🔑 GUARDAR EL ÍNDICE DE COLUMNA REAL
      }
    }
  }
  
  // ========================================
  // ========================================
  // PASO 4: PARSEAR CATEGORÍAS Y DATOS
  // ========================================
  const categories: EERRCategory[] = [];
  let currentCategory: EERRCategory | null = null;

  for (let i = dataStartRowIndex; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const firstCol = String(row[0] || '').trim();
    const firstColUpper = firstCol.toUpperCase();
    
    // SKIP filas vacías
    if (!firstCol || firstCol === '') continue;
    
    // Detectar MARGEN BRUTO OPERACIONAL como total especial (antes de detectar categorías)
    if (firstColUpper.includes('MARGEN BRUTO OPERACIONAL')) {
      if (currentCategory) {
        const totalRow: EERRRow = { Item: firstCol };
        // 🔑 Usar columnMapping para obtener valores correctos
        for (const header of headers) {
          if (header === 'Item') continue;
          const colIndex = columnMapping[header];
          if (colIndex !== undefined && colIndex < row.length) {
            totalRow[header] = row[colIndex] as string | number | undefined;
          }
        }
        currentCategory.total = totalRow;
        
        
        // Guardar categoría con total
        categories.push(currentCategory);
        currentCategory = null;
      }
      continue;
    }
    
    // Detectar EBIDTA como fila de valores especial (no categoría con items)
    if (firstColUpper === 'EBIDTA' || firstColUpper === 'EBITDA') {
      // Guardar categoría pendiente si existe
      if (currentCategory && currentCategory.rows.length > 0) {
        categories.push(currentCategory);
        currentCategory = null;
      }
      
      // Crear categoría especial solo con la fila EBIDTA (sin items)
      const ebitdaRow: EERRRow = { Item: firstCol };
      for (const header of headers) {
        if (header === 'Item') continue;
        const colIndex = columnMapping[header];
        if (colIndex !== undefined && colIndex < row.length) {
          ebitdaRow[header] = row[colIndex] as string | number | undefined;
        }
      }
      
      categories.push({
        name: firstCol, // "EBIDTA" o "EBITDA"
        rows: [ebitdaRow]
      });
      
      continue;
    }
    
    // Detectar totales de categoría PRIMERO (antes de detectar nuevas categorías)
    if (firstColUpper.startsWith('TOTAL ')) {
      if (currentCategory) {
        const totalRow: EERRRow = { Item: firstCol };
        // 🔑 Usar columnMapping para obtener valores correctos
        for (const header of headers) {
          if (header === 'Item') continue;
          const colIndex = columnMapping[header];
          if (colIndex !== undefined && colIndex < row.length) {
            totalRow[header] = row[colIndex] as string | number | undefined;
          }
        }
        currentCategory.total = totalRow;
        
        
        // Guardar categoría con total
        categories.push(currentCategory);
        currentCategory = null;
      }
      continue;
    }
    
    // Detectar inicio de categoría (HEADERS DE SECCIONES)
    // Normalizar espacios múltiples para comparación (ej: "GASTOS  DE" → "GASTOS DE")
    const normalizedFirstCol = firstColUpper.replace(/\s+/g, ' ').trim();
    
    if (normalizedFirstCol.includes('INGRESOS OPERACIONALES') ||
        normalizedFirstCol.includes('GASTOS DE REMUNERACION') ||
        normalizedFirstCol.includes('GASTOS DE OPERACION') ||
        normalizedFirstCol.includes('GASTOS DE ADMINISTRACION') ||
        normalizedFirstCol.includes('GASTOS GENERALES DE ADMINISTRACION') ||
        normalizedFirstCol.includes('OTROS GASTOS') ||
        normalizedFirstCol.includes('OTROS EGRESOS FUERA DE EXPLOTACION')) {
      
      // Guardar categoría anterior si existe
      if (currentCategory && currentCategory.rows.length > 0) {
        categories.push(currentCategory);
      }
      
      // Iniciar nueva categoría
      currentCategory = {
        name: firstCol,
        rows: []
      };
      
      continue;
    }

    // Detectar RESULTADO NETO (fila final sin categoría)
    if (firstColUpper.includes('RESULTADO NETO')) {
      // Guardar categoría pendiente antes de resultado
      if (currentCategory && currentCategory.rows.length > 0) {
        categories.push(currentCategory);
        currentCategory = null;
      }
      
      const resultRow: EERRRow = { Item: firstCol };
      // 🔑 Usar columnMapping para obtener valores correctos
      for (const header of headers) {
        if (header === 'Item') continue;
        const colIndex = columnMapping[header];
        if (colIndex !== undefined && colIndex < row.length) {
          resultRow[header] = row[colIndex] as string | number | undefined;
        }
      }
      
      categories.push({
        name: firstCol, // Usar nombre original del Excel: "RESULTADO NETO"
        rows: [resultRow]
      });
      
      continue;
    }

    // Agregar fila a categoría actual (ITEMS REGULARES)
    if (currentCategory && firstCol && firstCol !== '') {
      const rowData: EERRRow = { Item: firstCol };
      // 🔑 Usar columnMapping para obtener valores correctos
      for (const header of headers) {
        if (header === 'Item') continue;
        const colIndex = columnMapping[header];
        if (colIndex !== undefined && colIndex < row.length) {
          rowData[header] = row[colIndex] as string | number | undefined;
        }
      }
      currentCategory.rows.push(rowData);
    }
  }

  // Guardar última categoría si existe
  if (currentCategory && currentCategory.rows.length > 0) {
    categories.push(currentCategory);
  }


  return {
    sheetName,
    months,
    categories
  };
}

/**
 * Parser para hoja Consolidado (formato antiguo)
 * Lee hoja con 3 secciones: Labranza, Sevilla, Consolidados
 */
export function parseConsolidado(workbook: XLSX.WorkBook): ExcelSection[] | null {
  
  const sheetName = workbook.SheetNames.find(
    name => name.toLowerCase() === 'consolidado' || name.toLowerCase() === 'consolidados'
  );

  if (!sheetName) {
    console.error('[parseConsolidado] No se encontró la hoja "Consolidado" o "Consolidados"');
    return null;
  }


  const worksheet = workbook.Sheets[sheetName];
  const allDataRaw = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  }) as unknown[][];


  // Detectar secciones (Labranza, Sevilla, Consolidados)
  const sectionRanges: Array<{
    name: 'Labranza' | 'Sevilla' | 'Consolidados',
    startRow: number,
    headerRow: number,
    dataStartRow: number,
    endRow: number
  }> = [];
  
  for (let i = 0; i < allDataRaw.length; i++) {
    const row = allDataRaw[i];
    const rowText = row.map(v => String(v || '').toLowerCase().trim()).join(' ');
    
    if (rowText.includes('labranza') && !rowText.includes('item')) {
      sectionRanges.push({
        name: 'Labranza',
        startRow: i,
        headerRow: -1,
        dataStartRow: -1,
        endRow: -1
      });
    } else if (rowText.includes('sevilla') && !rowText.includes('item')) {
      sectionRanges.push({
        name: 'Sevilla',
        startRow: i,
        headerRow: -1,
        dataStartRow: -1,
        endRow: -1
      });
    } else if (rowText.includes('consolidado') && !rowText.includes('item')) {
      sectionRanges.push({
        name: 'Consolidados',
        startRow: i,
        headerRow: -1,
        dataStartRow: -1,
        endRow: -1
      });
    }
  }

  // Para cada sección, encontrar headers y datos
  for (let s = 0; s < sectionRanges.length; s++) {
    const section = sectionRanges[s];
    const nextSectionStart = s + 1 < sectionRanges.length ? sectionRanges[s + 1].startRow : allDataRaw.length;
    
    for (let i = section.startRow + 1; i < nextSectionStart; i++) {
      const row = allDataRaw[i];
      const rowText = row.map(v => String(v || '').toLowerCase().trim()).join(' ');
      
      if (rowText.includes('enero') && rowText.includes('febrero')) {
        section.headerRow = i;
        section.dataStartRow = i + 2;
        break;
      }
    }
    
    section.endRow = nextSectionStart;
  }

  // Construir headers
  const headers: string[] = ['Item'];
  const firstSectionWithHeaders = sectionRanges.find(s => s.headerRow >= 0);
  
  if (firstSectionWithHeaders && firstSectionWithHeaders.headerRow >= 0) {
    const monthRow = allDataRaw[firstSectionWithHeaders.headerRow];
    const subHeaderRow = allDataRaw[firstSectionWithHeaders.headerRow + 1];
    
    let currentMonth = '';
    for (let i = 1; i < monthRow.length; i++) {
      const monthVal = String(monthRow[i] || '').trim();
      const subVal = String(subHeaderRow[i] || '').trim().toLowerCase();
      
      if (monthVal && monthVal !== '') {
        currentMonth = monthVal;
      }
      
      if (currentMonth) {
        if (subVal.includes('monto') || subVal === 'monto') {
          headers.push(`${currentMonth} Monto`);
        } else if (subVal === '%' || subVal.includes('%')) {
          headers.push(`${currentMonth} %`);
        } else if (subVal.includes('promedio')) {
          headers.push(`${currentMonth} Promedio`);
        }
      }
    }
    
  }

  // Parsear datos de cada sección
  const sections: ExcelSection[] = [];
  
  for (const sectionRange of sectionRanges) {
    if (sectionRange.dataStartRow < 0) continue;
    
    const sectionData: ExcelRow[] = [];
    
    for (let i = sectionRange.dataStartRow; i < sectionRange.endRow; i++) {
      const row = allDataRaw[i];
      if (!row || row.length === 0 || !row[0]) continue;
      
      const firstCol = String(row[0] || '').trim();
      if (!firstCol || firstCol === '') break;
      
      const rowData: ExcelRow = { Item: firstCol };
      for (let j = 1; j < headers.length && j < row.length; j++) {
        rowData[headers[j]] = row[j] as string | number | undefined;
      }
      sectionData.push(rowData);
    }
    
    if (sectionData.length > 0) {
      sections.push({
        name: sectionRange.name,
        data: sectionData
      });
    }
  }

  return sections.length > 0 ? sections : null;
}

/**
 * Parser para hoja "LC" (Libro de Compras)
 * Lee transacciones del libro de compras del SII
 */
export function parseLibroComprasSheet(workbook: XLSX.WorkBook): any[] | null {
  const sheetName = 'LC';
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    console.error(`[parseLibroComprasSheet] ❌ Hoja "${sheetName}" NO encontrada`);
    return null;
  }

  // Convertir a JSON usando la primera fila como headers
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    raw: false,
    defval: ''
  }) as unknown[][];

  if (rawData.length < 2) {
    console.error(`[parseLibroComprasSheet] ❌ No hay datos en la hoja LC`);
    return null;
  }

  // Primera fila son los headers
  const headers = rawData[0] as string[];
  const transactions: any[] = [];

  // Normalizar nombres de columnas para mapeo consistente
  const headerMap: { [key: string]: string } = {};
  headers.forEach((header, index) => {
    const normalized = String(header || '').trim();
    headerMap[normalized] = normalized;
  });

  // Procesar cada fila de datos (desde la segunda fila)
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i] as any[];
    
    // Saltar filas vacías
    if (!row[0] || String(row[0]).trim() === '') continue;

    const transaction: any = {
      nro: parseFloat(row[0]) || 0,
      tipoDoc: String(row[1] || '').trim(),
      tipoCompra: String(row[2] || '').trim(),
      rutProveedor: String(row[3] || '').trim(),
      razonSocial: String(row[4] || '').trim(),
      unidadNegocio: String(row[5] || '').trim(),
      cuenta: String(row[6] || '').trim(),
      folio: String(row[7] || '').trim(),
      fechaDocto: row[8] || '',
      fechaRecepcion: row[9] || '',
      fechaAcuse: row[10] || '',
      montoExento: parseFloat(row[11]) || 0,
      montoNeto: parseFloat(row[12]) || 0,
      montoIVARecuperable: parseFloat(row[13]) || 0,
      montoIVANoRecuperable: parseFloat(row[14]) || 0,
      codigoIVANoRec: String(row[15] || '').trim(),
      montoTotal: parseFloat(row[16]) || 0,
      montoNetoActivoFijo: parseFloat(row[17]) || 0,
      ivaActivoFijo: parseFloat(row[18]) || 0,
      ivaUsoComun: parseFloat(row[19]) || 0,
      imptoSinDerechoCredito: parseFloat(row[20]) || 0,
      ivaNoRetenido: parseFloat(row[21]) || 0,
      tabacosPuros: parseFloat(row[22]) || 0,
      tabacosCigarrillos: parseFloat(row[23]) || 0,
      tabacosElaborados: parseFloat(row[24]) || 0,
      nceNdeSobreFactCompra: parseFloat(row[25]) || 0,
      codigoOtroImpuesto: String(row[26] || '').trim(),
      valorOtroImpuesto: parseFloat(row[27]) || 0,
      tasaOtroImpuesto: parseFloat(row[28]) || 0,
    };

    transactions.push(transaction);
  }

  console.log(`[parseLibroComprasSheet] ✅ Parseadas ${transactions.length} transacciones`);
  return transactions;
}

/**
 * Parser para hoja "CLASIFICACIÓN" (Proveedores)
 * Lee catálogo de proveedores con sus clasificaciones
 */
export function parseClasificacionSheet(workbook: XLSX.WorkBook): any[] | null {
  console.log('[parseClasificacionSheet] 🔍 Buscando hoja de clasificación...');
  console.log('[parseClasificacionSheet] 📋 Hojas disponibles:', workbook.SheetNames);
  
  // Buscar la hoja con o sin tilde
  let sheetName = 'CLASIFICACIÓN';
  let worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    console.log('[parseClasificacionSheet] ⚠️ No se encontró "CLASIFICACIÓN" (con tilde), intentando sin tilde...');
    // Intentar sin tilde
    sheetName = 'CLASIFICACION';
    worksheet = workbook.Sheets[sheetName];
  }
  
  if (!worksheet) {
    console.error(`[parseClasificacionSheet] ❌ Hoja "CLASIFICACIÓN" o "CLASIFICACION" NO encontrada`);
    console.log('[parseClasificacionSheet] 💡 Intentando búsqueda flexible...');
    
    // Búsqueda flexible - cualquier hoja que contenga "clasif"
    const foundSheet = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('clasif')
    );
    
    if (foundSheet) {
      console.log(`[parseClasificacionSheet] ✅ Encontrada hoja alternativa: "${foundSheet}"`);
      sheetName = foundSheet;
      worksheet = workbook.Sheets[foundSheet];
    } else {
      return null;
    }
  } else {
    console.log(`[parseClasificacionSheet] ✅ Hoja encontrada: "${sheetName}"`);
  }

  // Convertir a JSON sin asumir headers
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    raw: false,
    defval: ''
  }) as unknown[][];

  if (rawData.length < 2) {
    console.error(`[parseClasificacionSheet] ❌ No hay datos en la hoja CLASIFICACIÓN`);
    return null;
  }

  // Buscar la fila de headers (buscar fila con "RUT")
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i] as string[];
    const hasRut = row.some(cell => {
      const normalized = String(cell || '').trim().toUpperCase();
      return normalized === 'RUT' || normalized.includes('RUT');
    });
    
    if (hasRut) {
      headerRowIndex = i;
      console.log(`[parseClasificacionSheet] ✅ Fila de headers encontrada en índice ${i}`);
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error(`[parseClasificacionSheet] ❌ No se encontró fila de headers con "RUT"`);
    return null;
  }

  // Extraer headers
  const headers = rawData[headerRowIndex] as string[];
  const dataStartRow = headerRowIndex + 1;
  const proveedores: any[] = [];

  // Log de headers para debug
  console.log(`[parseClasificacionSheet] 📋 Headers encontrados:`, headers.map((h, i) => `[${i}] ${h}`));

  // Encontrar índices de columnas importantes (búsqueda flexible)
  const rutIndex = headers.findIndex(h => {
    const normalized = String(h || '').trim().toUpperCase();
    return normalized === 'RUT' || normalized.includes('RUT');
  });
  
  const nombreIndex = headers.findIndex(h => {
    const normalized = String(h || '').trim().toUpperCase();
    // Buscar "Columna 2", "NOMBRE", "RAZON SOCIAL" o la segunda columna si no hay match
    return normalized.includes('COLUMNA') || normalized.includes('NOMBRE') || normalized.includes('RAZON');
  });
  
  // Si no se encontró nombreIndex, usar la columna 1 (segunda columna)
  const finalNombreIndex = nombreIndex !== -1 ? nombreIndex : 1;
  
  const ccIndex = headers.findIndex(h => {
    const normalized = String(h || '').trim().toUpperCase();
    return normalized === 'CC' || normalized.includes('CENTRO') || normalized.includes('COSTO');
  });
  
  const cuentaIndex = headers.findIndex(h => {
    const normalized = String(h || '').trim().toUpperCase();
    return normalized === 'CUENTA' || normalized.includes('TIPO');
  });
  
  const obsIndex = headers.findIndex(h => {
    const normalized = String(h || '').trim().toUpperCase();
    return normalized === 'OBS' || normalized.includes('OBSERV');
  });

  console.log(`[parseClasificacionSheet] 🔍 Índices: RUT=${rutIndex}, Nombre=${finalNombreIndex}, CC=${ccIndex}, Cuenta=${cuentaIndex}, OBS=${obsIndex}`);

  if (rutIndex === -1) {
    console.error(`[parseClasificacionSheet] ❌ No se encontró columna RUT`);
    return null;
  }

  // Procesar cada fila de datos (desde después de los headers)
  for (let i = dataStartRow; i < rawData.length; i++) {
    const row = rawData[i] as any[];
    
    // Saltar filas vacías
    const rut = String(row[rutIndex] || '').trim();
    if (!rut || rut === '') continue;

    const clasificacion = {
      rut,
      nombre: String(row[finalNombreIndex] || '').trim(),
      centroCosto: ccIndex !== -1 ? String(row[ccIndex] || '').trim() : '',
      tipoCuenta: cuentaIndex !== -1 ? String(row[cuentaIndex] || '').trim() : '',
      observaciones: obsIndex !== -1 ? String(row[obsIndex] || '').trim() : '',
    };

    proveedores.push(clasificacion);
  }

  console.log(`[parseClasificacionSheet] ✅ Parseados ${proveedores.length} registros de proveedores`);
  return proveedores;
}
