import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GraphSnapshot {
  id: string;
  viewName: string;
  imageData?: string; // Base64 de la imagen capturada (para gráficos simples)
  htmlData?: string; // HTML serializado (para vistas complejas con tablas)
  timestamp: number;
  period: string;
  notes?: string;
}

interface ReportState {
  graphs: GraphSnapshot[];
  isGenerating: boolean;
  addGraph: (graph: Omit<GraphSnapshot, 'id' | 'timestamp'>) => void;
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

      addGraph: (graph) =>
        set((state) => {
          // Verificar si ya existe un gráfico de la misma vista
          const existingIndex = state.graphs.findIndex(
            (g) => g.viewName === graph.viewName && g.period === graph.period
          );

          const newGraph: GraphSnapshot = {
            ...graph,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
          };

          if (existingIndex !== -1) {
            // Reemplazar el gráfico existente
            const newGraphs = [...state.graphs];
            newGraphs[existingIndex] = newGraph;
            return { graphs: newGraphs };
          } else {
            // Agregar nuevo gráfico
            return { graphs: [...state.graphs, newGraph] };
          }
        }),

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
