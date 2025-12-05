import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GraphSnapshot {
  id: string;
  viewName: string;
  uniqueKey: string; // Identificador único basado en todos los parámetros del gráfico
  imageData?: string; // Base64 de la imagen capturada (para gráficos simples)
  htmlData?: string; // HTML serializado (para vistas complejas con tablas)
  timestamp: number;
  period: string;
  notes?: string;
}

interface ReportState {
  graphs: GraphSnapshot[];
  isGenerating: boolean;
  addGraph: (graph: Omit<GraphSnapshot, 'id' | 'timestamp'>) => boolean; // Retorna true si se agregó, false si ya existía
  removeGraph: (id: string) => void;
  updateGraphNotes: (id: string, notes: string) => void;
  reorderGraphs: (startIndex: number, endIndex: number) => void;
  clearAll: () => void;
  setGenerating: (isGenerating: boolean) => void;
}

export const useReportStore = create<ReportState>()(
  persist(
    (set) => ({
      graphs: [],
      isGenerating: false,

      addGraph: (graph) => {
        // Verificar si ya existe un gráfico con el mismo uniqueKey
        const existingIndex = useReportStore.getState().graphs.findIndex(
          (g) => g.uniqueKey === graph.uniqueKey
        );

        if (existingIndex !== -1) {
          // Ya existe, no hacer nada y retornar false
          return false;
        }

        // Agregar nuevo gráfico (parámetros diferentes)
        const newGraph: GraphSnapshot = {
          ...graph,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };

        set((state) => ({
          graphs: [...state.graphs, newGraph]
        }));

        return true;
      },

      removeGraph: (id) =>
        set((state) => ({
          graphs: state.graphs.filter((g) => g.id !== id),
        })),

      updateGraphNotes: (id, notes) =>
        set((state) => ({
          graphs: state.graphs.map((g) =>
            g.id === id ? { ...g, notes } : g
          ),
        })),

      reorderGraphs: (startIndex, endIndex) =>
        set((state) => {
          const result = Array.from(state.graphs);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          return { graphs: result };
        }),

      clearAll: () => set({ graphs: [] }),

      setGenerating: (isGenerating) => set({ isGenerating }),
    }),
    {
      name: 'report-storage', // LocalStorage key
      partialize: (state) => ({ graphs: state.graphs }), // Solo persistir los gráficos
    }
  )
);
