'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ChartRef } from './SalesAccumulatedChart';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface EbitdaDataPoint {
  month: string;
  labranza: number;
  sevilla: number;
  total: number;
}

interface EbitdaLineChartProps {
  data: EbitdaDataPoint[];
}

const EbitdaLineChart = forwardRef<ChartRef, EbitdaLineChartProps>(
  ({ data }, ref) => {
    const chartRef = useRef<ChartJS<'line'>>(null);

    useImperativeHandle(ref, () => ({
      exportToPNG: () => {
        if (chartRef.current) {
          const url = chartRef.current.toBase64Image();
          const link = document.createElement('a');
          link.download = `ebitda-mensual-${new Date().toISOString().split('T')[0]}.png`;
          link.href = url;
          link.click();
        }
      },
    }));

    const chartData = {
      labels: data.map(d => d.month),
      datasets: [
        {
          label: 'EBITDA Total',
          data: data.map(d => d.total),
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgb(99, 102, 241)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Labranza',
          data: data.map(d => d.labranza),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.05)',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(34, 197, 94)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Sevilla',
          data: data.map(d => d.sevilla),
          borderColor: 'rgb(234, 88, 12)',
          backgroundColor: 'rgba(234, 88, 12, 0.05)',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(234, 88, 12)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: false,
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
              weight: 'bold' as const,
            },
          },
        },
        datalabels: {
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
            label: function(context: { dataset: { label?: string }; parsed: { y: number } }) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                notation: 'compact',
                compactDisplay: 'short',
              }).format(value)}`;
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
              size: 11,
              weight: '500' as const,
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

    return <Line ref={chartRef} data={chartData} options={options as never} />;
  }
);

EbitdaLineChart.displayName = 'EbitdaLineChart';

export default EbitdaLineChart;
