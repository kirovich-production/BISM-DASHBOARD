'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
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
import type { ChartRef } from './SalesAccumulatedChart';

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

export interface SalesVsEbitdaDataPoint {
  month: string;
  sales: number;
  ebitda: number;
}

interface SalesVsEbitdaChartProps {
  data: SalesVsEbitdaDataPoint[];
}

const SalesVsEbitdaChart = forwardRef<ChartRef, SalesVsEbitdaChartProps>(
  ({ data }, ref) => {
    const chartRef = useRef<ChartJS>(null);

    useImperativeHandle(ref, () => ({
      exportToPNG: () => {
        if (chartRef.current) {
          const url = chartRef.current.toBase64Image();
          const link = document.createElement('a');
          link.download = `ventas-vs-ebitda-${new Date().toISOString().split('T')[0]}.png`;
          link.href = url;
          link.click();
        }
      },
    }));

    const chartData = {
      labels: data.map(d => d.month),
      datasets: [
        {
          type: 'bar' as const,
          label: 'Ventas Netas',
          data: data.map(d => d.sales),
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 2,
          yAxisID: 'y',
          order: 2,
        },
        {
          type: 'line' as const,
          label: 'EBITDA',
          data: data.map(d => d.ebitda),
          borderColor: 'rgb(234, 88, 12)',
          backgroundColor: 'rgba(234, 88, 12, 0.1)',
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgb(234, 88, 12)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          yAxisID: 'y1',
          order: 1,
          fill: true,
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
            label: function(context: { label?: string; parsed: { y: number } }) {
              const label = context.label || '';
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
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Ventas Netas',
            font: {
              size: 12,
              weight: 'bold' as const,
            },
          },
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
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'EBITDA',
            font: {
              size: 12,
              weight: 'bold' as const,
            },
          },
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
            drawOnChartArea: false,
          },
        },
      },
    };

    return <Chart ref={chartRef} type="bar" data={chartData} options={options as never} />;
  }
);

SalesVsEbitdaChart.displayName = 'SalesVsEbitdaChart';

export default SalesVsEbitdaChart;
