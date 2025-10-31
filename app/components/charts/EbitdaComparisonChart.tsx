'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ChartRef } from './SalesAccumulatedChart';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface EbitdaComparisonChartProps {
  labranzaTotal: number;
  sevillaTotal: number;
  consolidadoTotal: number;
}

const EbitdaComparisonChart = forwardRef<ChartRef, EbitdaComparisonChartProps>(
  ({ labranzaTotal, sevillaTotal, consolidadoTotal }, ref) => {
    const chartRef = useRef<ChartJS<'bar'>>(null);

    useImperativeHandle(ref, () => ({
      exportToPNG: () => {
        if (chartRef.current) {
          const url = chartRef.current.toBase64Image();
          const link = document.createElement('a');
          link.download = `ebitda-comparacion-${new Date().toISOString().split('T')[0]}.png`;
          link.href = url;
          link.click();
        }
      },
    }));

    const data = {
      labels: ['Labranza', 'Sevilla', 'Consolidado'],
      datasets: [
        {
          label: 'EBITDA',
          data: [labranzaTotal, sevillaTotal, consolidadoTotal],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(234, 88, 12, 0.8)',
            'rgba(99, 102, 241, 0.8)',
          ],
          borderColor: [
            'rgb(34, 197, 94)',
            'rgb(234, 88, 12)',
            'rgb(99, 102, 241)',
          ],
          borderWidth: 2,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold' as const,
          },
          bodyFont: {
            size: 13,
          },
          callbacks: {
            label: function(context: { parsed: { y: number } }) {
              return `EBITDA: ${new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                notation: 'compact',
                compactDisplay: 'short',
              }).format(context.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 12,
              weight: 'bold' as const,
            },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value: string | number) {
              return new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                notation: 'compact',
                compactDisplay: 'short',
              }).format(Number(value));
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
        },
      },
    };

    return <Bar ref={chartRef} data={data} options={options as never} />;
  }
);

EbitdaComparisonChart.displayName = 'EbitdaComparisonChart';

export default EbitdaComparisonChart;
