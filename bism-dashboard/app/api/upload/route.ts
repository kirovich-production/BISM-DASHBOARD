import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import * as XLSX from 'xlsx';
import { ExcelSection, ExcelRow } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar que sea un archivo Excel
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'El archivo debe ser un Excel (.xls o .xlsx)' },
        { status: 400 }
      );
    }

    // Leer el archivo Excel
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Buscar la hoja "Consolidado"
    const consolidadoSheet = workbook.SheetNames.find(
      name => name.toLowerCase() === 'consolidado' || name.toLowerCase() === 'consolidados'
    );

    if (!consolidadoSheet) {
      return NextResponse.json(
        { error: 'No se encontró la hoja "Consolidado" en el archivo Excel' },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[consolidadoSheet];
    
    // Convertir a JSON SIN headers automáticos para capturar todas las filas
    const allDataRaw = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false 
    }) as unknown[][];

    // Detectar las secciones y sus rangos
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
      
      // Detectar nombres de secciones
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

    // Para cada sección, encontrar sus headers y datos
    for (let s = 0; s < sectionRanges.length; s++) {
      const section = sectionRanges[s];
      const nextSectionStart = s + 1 < sectionRanges.length ? sectionRanges[s + 1].startRow : allDataRaw.length;
      
      // Buscar la fila de meses (Enero, Febrero, etc.) después del inicio de la sección
      for (let i = section.startRow + 1; i < nextSectionStart; i++) {
        const row = allDataRaw[i];
        const rowText = row.map(v => String(v || '').toLowerCase().trim()).join(' ');
        
        if (rowText.includes('enero') && rowText.includes('febrero')) {
          section.headerRow = i;
          section.dataStartRow = i + 2; // Saltar fila de meses y fila de Monto/%
          break;
        }
      }
      
      // El final de esta sección es el inicio de la siguiente (o el final del archivo)
      section.endRow = nextSectionStart;
    }

    // Construir headers a partir de la primera sección que tenga headers
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
          } else if (subVal) {
            headers.push(`${currentMonth} ${subVal}`);
          }
        }
      }
    }

    // Parsear los datos de cada sección
    const sections: ExcelSection[] = [];
    
    for (const sectionRange of sectionRanges) {
      if (sectionRange.dataStartRow < 0) continue;
      
      const sectionData: ExcelRow[] = [];
      
      for (let i = sectionRange.dataStartRow; i < sectionRange.endRow; i++) {
        const row = allDataRaw[i];
        if (!row || row.length === 0 || !row[0]) continue;
        
        const firstCol = String(row[0] || '').trim();
        // Detener si encontramos una fila vacía o el inicio de otra tabla
        if (!firstCol || firstCol === '') break;
        
        const rowData: Record<string, unknown> = {};
        for (let j = 0; j < headers.length && j < row.length; j++) {
          rowData[headers[j]] = row[j];
        }
        sectionData.push(rowData as ExcelRow);
      }
      
      if (sectionData.length > 0) {
        sections.push({
          name: sectionRange.name,
          data: sectionData
        });
      }
    }

    if (sections.length === 0) {
      return NextResponse.json(
        { error: 'La hoja Consolidado está vacía' },
        { status: 400 }
      );
    }

    if (sections.length === 0) {
      return NextResponse.json(
        { error: 'No se pudieron detectar las secciones (Labranza, Sevilla, Consolidados)' },
        { status: 400 }
      );
    }

    // Conectar a MongoDB
    const { db } = await connectToDatabase();
    const collection = db.collection('excel_uploads');

    // Crear documento con metadata
    const document = {
      fileName: file.name,
      sheetName: consolidadoSheet,
      uploadedAt: new Date(),
      sections: sections
    };

    // Insertar documento completo en MongoDB
    await collection.insertOne(document);

    return NextResponse.json({
      success: true,
      message: 'Datos cargados exitosamente',
      recordsInserted: 1,
      fileName: file.name,
      sheetName: consolidadoSheet,
      sectionsFound: sections.map(s => s.name)
    });

  } catch (error) {
    console.error('Error al procesar el archivo:', error);
    return NextResponse.json(
      { error: 'Error al procesar el archivo Excel' },
      { status: 500 }
    );
  }
}
