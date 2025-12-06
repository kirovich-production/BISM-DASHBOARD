'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Interfaces
interface ExcelRow {
  Item: string;
  [key: string]: string | number | undefined;
}

interface EERRData {
  sheetName: string;
  months: string[];
  categories: Array<{
    name: string;
    rows: Array<{
      Item: string;
      [key: string]: string | number | undefined;
    }>;
  }>;
}

interface ComparativoEbitdaViewProps {
  consolidadoData: ExcelRow[];
  sucursalesData: Array<{
    name: string;
    data: EERRData | null;
  }>;
  selectedUserName?: string;
  selectedPeriod?: string;
}

// Componente dinámico que solo se carga en el cliente
const DynamicComparativoEbitda: ComponentType<ComparativoEbitdaViewProps> = dynamic(
  () => import('../WaterfallChartsView').then(mod => ({ default: mod.default })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Cargando gráfico comparativo...</span>
        </div>
      </div>
    )
  }
);

export default DynamicComparativoEbitda;