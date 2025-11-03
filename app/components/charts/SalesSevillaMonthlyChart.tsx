'use client';

import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
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
import type { MonthlySalesDataPoint } from './useMonthlySalesData';
import type { ChartRef } from './SalesAccumulatedChart';
import QuarterSelector from '../QuarterSelector';
import MonthComparisonSelector from '../MonthComparisonSelector';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SalesSevillaMonthlyChartProps {
  monthlyData: MonthlySalesDataPoint[];
  quarterOptions: { label: string; value: string; months: string[] }[];
  monthOptions: { label: string; value: string }[];
  onFilterByQuarter: (quarterValue: string) => MonthlySalesDataPoint[];
  onFilterByComparison: (month1: string, month2: string) => MonthlySalesDataPoint[];
}

type ViewMode = 'all' | 'quarter' | 'comparison';

const SalesSevillaMonthlyChart = forwardRef<ChartRef, SalesSevillaMonthlyChartProps>(
  ({ monthlyData, quarterOptions, monthOptions, onFilterByQuarter, onFilterByComparison }, ref) => {
    const chartRef = useRef<ChartJS<'bar'>>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [selectedQuarter, setSelectedQuarter] = useState('');
    const [comparisonMonth1, setComparisonMonth1] = useState('');
    const [comparisonMonth2, setComparisonMonth2] = useState('');

    useImperativeHandle(ref, () => ({
      exportToPNG: () => {
        if (chartRef.current) {
          const url = chartRef.current.toBase64Image();
          const link = document.createElement('a');
          link.download = `ventas-mensuales-sevilla-${new Date().toISOString().split('T')[0]}.png`;
          link.href = url;
          link.click();
        }
      },
    }));

    // Determinar qué datos mostrar según el modo
    let displayData = monthlyData;
    
    if (viewMode === 'quarter' && selectedQuarter) {
      displayData = onFilterByQuarter(selectedQuarter);
    } else if (viewMode === 'comparison' && comparisonMonth1 && comparisonMonth2) {
      displayData = onFilterByComparison(comparisonMonth1, comparisonMonth2);
    }

    const chartData = {
      labels: displayData.map(d => d.month),
      datasets: [
        {
          label: 'Ventas Sevilla',
          data: displayData.map(d => d.sevilla),
          backgroundColor: 'rgba(234, 88, 12, 0.8)',
          borderColor: 'rgb(234, 88, 12)',
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
              return `Ventas: ${new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
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
              size: 11,
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

    const handleModeChange = (mode: ViewMode) => {
      setViewMode(mode);
      // Reset selections cuando cambias de modo
      if (mode !== 'quarter') setSelectedQuarter('');
      if (mode !== 'comparison') {
        setComparisonMonth1('');
        setComparisonMonth2('');
      }
    };

    return (
      <div className="h-full flex flex-col">
        {/* Controles */}
        <div className="mb-4 flex flex-wrap items-center gap-2 pb-3 border-b border-gray-200">
          <button
            onClick={() => handleModeChange('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Vista Completa
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleModeChange('quarter')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'quarter'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Trimestre
            </button>
            {viewMode === 'quarter' && (
              <QuarterSelector
                options={quarterOptions}
                value={selectedQuarter}
                onChange={setSelectedQuarter}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleModeChange('comparison')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'comparison'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Comparar
            </button>
            {viewMode === 'comparison' && (
              <MonthComparisonSelector
                options={monthOptions}
                month1={comparisonMonth1}
                month2={comparisonMonth2}
                onMonth1Change={setComparisonMonth1}
                onMonth2Change={setComparisonMonth2}
              />
            )}
          </div>
        </div>

        {/* Gráfico */}
        <div className="h-[500px]">
          <Bar ref={chartRef} data={chartData} options={options as never} />
        </div>
      </div>
    );
  }
);

SalesSevillaMonthlyChart.displayName = 'SalesSevillaMonthlyChart';

export default SalesSevillaMonthlyChart;
