import * as XLSX from 'xlsx';
import { EERRData, EERRCategory, EERRRow, ExcelSection, ExcelRow } from '@/types';

/**
 * Parser para hojas EERR (Estado de Resultados)
 * Lee hojas con formato: EERR SEVILLA, EERR LABRANZA
 */
export function parseEERR(workbook: XLSX.WorkBook, sheetName: string): EERRData | null {
  console.log(`[parseEERR] Intentando procesar hoja: "${sheetName}"`);
  console.log('[parseEERR] Hojas disponibles:', workbook.SheetNames.join(', '));
  
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    console.error(`[parseEERR] ❌ Hoja "${sheetName}" NO encontrada`);
    // Intentar buscar una hoja similar
    const similarSheet = workbook.SheetNames.find(name => 
      name.toLowerCase().includes(sheetName.toLowerCase().replace('eerr ', ''))
    );
    if (similarSheet) {
      console.log(`[parseEERR] 💡 Sugerencia: Se encontró una hoja similar: "${similarSheet}"`);
    }
    return null;
  }

  console.log(`[parseEERR] ✅ Hoja "${sheetName}" encontrada, procesando...`);

  // Convertir a array de arrays
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  }) as unknown[][];

  console.log(`[parseEERR] Total de filas: ${rawData.length}`);

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
      console.log(`[parseEERR] 📅 Estructura detectada:`);
      console.log(`   - Fila de meses: ${monthsRowIndex}`);
      console.log(`   - Fila de sub-headers: ${subHeaderRowIndex}`);
      console.log(`   - Datos inician en: ${dataStartRowIndex} (incluye headers de categorías)`);
      break;
    }
  }

  if (monthsRowIndex === -1) {
    console.error(`[parseEERR] ❌ No se detectó la fila de meses`);
    return null;
  }

  // DEBUG: Mostrar primeras 10 filas después de meses
  console.log(`[parseEERR] 🔍 DEBUG - Primeras filas después de la fila de meses:`);
  for (let i = monthsRowIndex; i < Math.min(monthsRowIndex + 10, rawData.length); i++) {
    const row = rawData[i];
    const firstCol = row && row[0] ? String(row[0]).trim() : '';
    console.log(`   Fila ${i}: "${firstCol}"`);
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

  console.log(`[parseEERR] Meses encontrados (${months.length}): ${months.join(', ')}`);

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
      console.log(`[${sheetName}] 🔄 Nuevo mes detectado en columna ${i}: "${currentMonth}"`);
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
        
        // Log especial para CONSOLIDADO
        if (currentMonth.toUpperCase().includes('CONSOLIDADO')) {
          console.log(`[${sheetName}] 📍 CONSOLIDADO columna ${i}: "${headerName}" (subVal: "${subVal}")`);
        }
      }
    }
  }
  
  console.log(`[${sheetName}] Headers generados (${headers.length}): ${headers.slice(0, 5).join(', ')}...`);
  console.log(`[${sheetName}] Últimos 5 headers:`, headers.slice(-5).join(', '));
  console.log(`[${sheetName}] 🗺️ Mapeo de columnas (primeros 3):`, Object.entries(columnMapping).slice(0, 3));
  
  // ========================================
  // PASO 4: MOSTRAR PREVIEW DE DATOS
  // ========================================
  console.log(`[${sheetName}] Preview de filas (desde fila ${dataStartRowIndex}):`);
  for (let i = dataStartRowIndex; i < Math.min(dataStartRowIndex + 35, rawData.length); i++) {
    const firstCol = String(rawData[i][0] || '').trim();
    const firstColUpper = firstCol.toUpperCase();
    
    // Marcar filas importantes
    let marker = '   ';
    if (firstColUpper.includes('INGRESOS OPERACIONALES')) marker = '🟢 HEADER → ';
    if (firstColUpper.includes('GASTOS DE ADMINISTRACION')) marker = '🔵 HEADER → ';
    if (firstColUpper.includes('GASTOS GENERALES DE ADMINISTRACION')) marker = '🟣 HEADER → ';
    if (firstColUpper.includes('MARGEN BRUTO OPERACIONAL')) marker = '🟡 TOTAL → ';
    if (firstColUpper === 'VENTAS' || firstCol === 'Ventas') marker = '📊 ITEM → ';
    if (firstColUpper.includes('EBIDTA') || firstColUpper.includes('EBITDA')) marker = '💚 HEADER → ';
    
    if (firstCol) {
      console.log(`${marker}Fila ${i}: "${firstCol}"`);
    }
  }

  // ========================================
  // PASO 5: PARSEAR CATEGORÍAS Y DATOS
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
        
        console.log(`[${sheetName}] MARGEN BRUTO OPERACIONAL detectado como total de: ${currentCategory.name}`);
        
        // Guardar categoría con total
        categories.push(currentCategory);
        currentCategory = null;
      }
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
        
        console.log(`[${sheetName}] Total detectado para categoría: ${currentCategory.name}`);
        
        // Guardar categoría con total
        categories.push(currentCategory);
        currentCategory = null;
      }
      continue;
    }
    
    // Detectar inicio de categoría (HEADERS DE SECCIONES)
    if (firstColUpper.includes('INGRESOS OPERACIONALES') ||
        firstColUpper.includes('GASTOS DE REMUNERACION') ||
        firstColUpper.includes('GASTOS DE OPERACION') ||
        firstColUpper.includes('GASTOS DE ADMINISTRACION') ||
        firstColUpper.includes('GASTOS GENERALES DE ADMINISTRACION') ||
        firstColUpper.includes('OTROS GASTOS') ||
        firstColUpper.includes('OTROS EGRESOS FUERA DE EXPLOTACION') ||
        (firstColUpper === 'EBIDTA' || firstColUpper === 'EBITDA')) {
      
      // Guardar categoría anterior si existe
      if (currentCategory && currentCategory.rows.length > 0) {
        categories.push(currentCategory);
      }
      
      // Iniciar nueva categoría
      currentCategory = {
        name: firstCol,
        rows: []
      };
      
      console.log(`[${sheetName}] Nueva categoría detectada: ${firstCol} en fila ${i}`);
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
        name: 'RESULTADO FINAL',
        rows: [resultRow]
      });
      
      console.log(`[${sheetName}] RESULTADO NETO detectado como fila final`);
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
      
      // Log para debug (solo primera fila de cada categoría)
      if (currentCategory.rows.length === 1) {
        console.log(`[${sheetName}] 🔍 Primera fila de "${currentCategory.name}": ${firstCol}`);
        console.log(`[${sheetName}]    Valores de primeras 3 columnas:`, 
          headers.slice(1, 4).map(h => `${h}: ${rowData[h]}`).join(', '));
        
        // Log especial para CONSOLIDADO
        const consolidadoHeaders = headers.filter(h => h.toUpperCase().includes('CONSOLIDADO'));
        if (consolidadoHeaders.length > 0) {
          console.log(`[${sheetName}] 📊 Valores CONSOLIDADO de "${firstCol}":`, 
            consolidadoHeaders.map(h => `${h}: ${rowData[h]}`).join(', '));
        }
      }
    }
  }

  // Guardar última categoría si existe
  if (currentCategory && currentCategory.rows.length > 0) {
    categories.push(currentCategory);
  }

  console.log(`[${sheetName}] Total categorías parseadas: ${categories.length}`);
  console.log(`[${sheetName}] Meses detectados: ${months.join(', ')}`);

  return {
    sheetName,
    months,
    categories,
    rawData: rawData.slice(0, 100) // Guardar primeras 100 filas para debug
  };
}

/**
 * Parser para hoja Consolidado (formato antiguo)
 * Lee hoja con 3 secciones: Labranza, Sevilla, Consolidados
 */
export function parseConsolidado(workbook: XLSX.WorkBook): ExcelSection[] | null {
  console.log('[parseConsolidado] Hojas disponibles en el Excel:', workbook.SheetNames);
  
  const sheetName = workbook.SheetNames.find(
    name => name.toLowerCase() === 'consolidado' || name.toLowerCase() === 'consolidados'
  );

  if (!sheetName) {
    console.error('[parseConsolidado] No se encontró la hoja "Consolidado" o "Consolidados"');
    console.log('[parseConsolidado] Hojas encontradas:', workbook.SheetNames.join(', '));
    return null;
  }

  console.log(`[parseConsolidado] Procesando hoja: "${sheetName}"`);

  const worksheet = workbook.Sheets[sheetName];
  const allDataRaw = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false 
  }) as unknown[][];

  console.log(`[parseConsolidado] Total de filas en la hoja: ${allDataRaw.length}`);

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
    
    console.log(`[parseConsolidado] 📋 Headers construidos (${headers.length}):`, headers.slice(0, 5).join(', '), '...', headers.slice(-5).join(', '));
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
