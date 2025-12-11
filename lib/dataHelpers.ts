import { ObjectId, Collection } from 'mongodb';
import { LibroComprasData, LibroComprasTransaction } from '@/types';

/**
 * Helper para obtener documentos de Libro de Compras combinando búsquedas por ObjectId y string userId
 */

interface LibroComprasDoc extends LibroComprasData {
  data?: LibroComprasTransaction[];
}

/**
 * Combina transacciones de un documento Excel (string userId) y uno manual (ObjectId userId)
 */
function combinarTransacciones(
  docString: LibroComprasData | null,
  docObjectId: LibroComprasDoc | null,
  userId: string,
  sucursal: string,
  periodo: string
): LibroComprasData | null {
  if (!docString && !docObjectId) return null;
  
  const transaccionesExcel = docString?.transacciones || [];
  const transaccionesManuales = docObjectId?.data || [];
  const baseDoc = docString || docObjectId;
  
  return {
    userId,
    periodo,
    periodLabel: baseDoc!.periodLabel,
    sucursal,
    fileName: baseDoc!.fileName || 'manual',
    transacciones: [...transaccionesExcel, ...transaccionesManuales],
    createdAt: baseDoc!.createdAt,
    updatedAt: baseDoc!.updatedAt
  };
}

/**
 * Busca documentos de Libro de Compras para un período específico,
 * combinando resultados de userId como string y como ObjectId
 */
export async function buscarDocumentosPorPeriodo(
  collection: Collection,
  userId: string,
  sucursal: string,
  periodo: string
): Promise<LibroComprasData | null> {
  const [docObjectId, docString] = await Promise.all([
    collection.findOne({ 
      userId: new ObjectId(userId), 
      sucursal, 
      periodo 
    }) as Promise<LibroComprasDoc | null>,
    collection.findOne({ 
      userId, 
      sucursal, 
      periodo 
    }) as Promise<LibroComprasData | null>
  ]);
  
  return combinarTransacciones(docString, docObjectId, userId, sucursal, periodo);
}

/**
 * Busca todos los documentos de Libro de Compras para una sucursal,
 * combinando resultados por período
 */
export async function buscarTodosDocumentosPorSucursal(
  collection: Collection,
  userId: string,
  sucursal: string
): Promise<LibroComprasData[]> {
  const [docsObjectId, docsString] = await Promise.all([
    collection.find({ 
      userId: new ObjectId(userId), 
      sucursal 
    }).sort({ periodo: 1 }).toArray() as unknown as Promise<LibroComprasDoc[]>,
    collection.find({ 
      userId, 
      sucursal 
    }).sort({ periodo: 1 }).toArray() as unknown as Promise<LibroComprasData[]>
  ]);
  
  // Combinar documentos por periodo
  const periodoMap = new Map<string, LibroComprasData>();
  
  // Procesar documentos con transacciones del Excel (userId string)
  for (const doc of docsString) {
    periodoMap.set(doc.periodo, {
      userId,
      periodo: doc.periodo,
      periodLabel: doc.periodLabel,
      sucursal,
      fileName: doc.fileName || 'manual',
      transacciones: doc.transacciones || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  }
  
  // Agregar transacciones manuales (userId ObjectId)
  for (const doc of docsObjectId) {
    const existing = periodoMap.get(doc.periodo);
    
    if (existing) {
      existing.transacciones = [
        ...existing.transacciones,
        ...(doc.data || [])
      ];
    } else {
      periodoMap.set(doc.periodo, {
        userId,
        periodo: doc.periodo,
        periodLabel: doc.periodLabel,
        sucursal,
        fileName: doc.fileName || 'manual',
        transacciones: doc.data || [],
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      });
    }
  }
  
  return Array.from(periodoMap.values());
}

/**
 * Prepara documentos con valores manuales
 */
export async function prepararDocumentosConValores(
  docs: LibroComprasData[],
  userId: string,
  sucursal: string,
  valoresManualesCollection: Collection
): Promise<Array<{
  periodo: string;
  transacciones: LibroComprasTransaction[];
  valoresManuales: { [cuenta: string]: number };
}>> {
  return Promise.all(
    docs.map(async (doc) => {
      const valoresManualesDocs = await valoresManualesCollection.find({
        userId,
        periodo: doc.periodo,
        sucursal
      }).toArray();
      
      const valoresManuales: { [cuenta: string]: number } = {};
      valoresManualesDocs.forEach(v => {
        valoresManuales[v.cuenta] = v.monto;
      });
      
      // Combinar transacciones
      const docData = doc as LibroComprasData & { data?: LibroComprasTransaction[] };
      const transaccionesExcel = doc.transacciones || [];
      const transaccionesManuales = docData.data || [];
      
      return {
        periodo: doc.periodo,
        transacciones: [...transaccionesExcel, ...transaccionesManuales],
        valoresManuales
      };
    })
  );
}

/**
 * Crea un slug a partir del nombre de sucursal
 */
export function crearSucursalSlug(sucursalName: string): string {
  return sucursalName.toLowerCase().replace(/\s+/g, '_');
}
