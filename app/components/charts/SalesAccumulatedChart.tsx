'use client';

import { useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import type { ChartDataPoint } from './useChartData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface SalesAccumulatedChartProps {
  data: ChartDataPoint[];
}

export interface ChartRef {
  exportToPNG: () => void;
}

const SalesAccumulatedChart = forwardRef<ChartRef, SalesAccumulatedChartProps>(
  ({ data }, ref) => {
    const chartRef = useRef<ChartJS>(null);

    useImperativeHandle(ref, () => ({
      exportToPNG: () => {
        if (chartRef.current) {
          const url = chartRef.current.toBase64Image();
          const link = document.createElement('a');
          link.download = `ventas-acumuladas-${new Date().toISOString().split('T')[0]}.png`;
          link.href = url;
          link.click();
        }
      },
    }));

    // Calcular valores acumulados
    const accumulatedData = data.reduce((acc, curr, index) => {
      const prev = index > 0 ? acc[index - 1] : { consolidado: 0, labranza: 0, sevilla: 0 };
      acc.push({
        month: curr.month,
        consolidado: prev.consolidado + curr.consolidado,
        labranza: prev.labranza + curr.labranza,
        sevilla: prev.sevilla + curr.sevilla,
      });
      return acc;
    }, [] as ChartDataPoint[]);

    const chartData = {
      labels: data.map(d => d.month),
      datasets: [
        {
          type: 'bar' as const,
          label: 'Consolidado (Acumulado)',
          data: accumulatedData.map(d => d.consolidado),
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          type: 'line' as const,
          label: 'Labranza (Acumulado)',
          data: accumulatedData.map(d => d.labranza),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y',
        },
        {
          type: 'line' as const,
          label: 'Sevilla (Acumulado)',
          data: accumulatedData.map(d => d.sevilla),
          borderColor: 'rgb(234, 88, 12)',
          backgroundColor: 'rgba(234, 88, 12, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y',
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
            },
          },
        },
        datalabels: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function(context: { dataset: { label?: string }; parsed: { y: number | null } }) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                }).format(context.parsed.y);
              }
              return label;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          ticks: {
            callback: function(value: number | string) {
              return new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                notation: 'compact',
                compactDisplay: 'short',
              }).format(Number(value));
            },
          },
        },
      },
    };

    return <Chart ref={chartRef} type="bar" data={chartData} options={options} />;
  }
);

SalesAccumulatedChart.displayName = 'SalesAccumulatedChart';

export default SalesAccumulatedChart;
