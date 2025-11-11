'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Interface
interface ExcelRow {
  Item: string;
  [key: string]: string | number | undefined;
}

interface EERRData {
  sheetName: string;
  months: string[];
  categories: EERRCategory[];
  rawData?: unknown[];
}

interface EERRCategory {
  name: string;
  rows: EERRRow[];
  total?: EERRRow;
}

interface EERRRow {
  Item: string;
  [key: string]: string | number | undefined;
}

interface EbidtaComboViewProps {
  consolidadoData?: ExcelRow[];
  sevillaData?: EERRData;  
  labranzaData?: EERRData;
  selectedUserName?: string;
  selectedPeriod?: string;
}

// Componente dinámico que solo se carga en el cliente
const DynamicEbidtaCombo: ComponentType<EbidtaComboViewProps> = dynamic(
  () => import('../EbidtaComboView').then(mod => ({ default: mod.default })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Cargando gráfico combo...</span>
        </div>
      </div>
    )
  }
);

export default DynamicEbidtaCombo;