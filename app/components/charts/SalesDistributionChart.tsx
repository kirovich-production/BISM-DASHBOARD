'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { ChartRef } from './SalesAccumulatedChart';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SalesDistributionChartProps {
  labranzaTotal: number;
  sevillaTotal: number;
}

const SalesDistributionChart = forwardRef<ChartRef, SalesDistributionChartProps>(
  ({ labranzaTotal, sevillaTotal }, ref) => {
    const chartRef = useRef<ChartJS<'doughnut'>>(null);

    useImperativeHandle(ref, () => ({
      exportToPNG: () => {
        if (chartRef.current) {
          const url = chartRef.current.toBase64Image();
          const link = document.createElement('a');
          link.download = `distribucion-ventas-${new Date().toISOString().split('T')[0]}.png`;
          link.href = url;
          link.click();
        }
      },
    }));

    const total = labranzaTotal + sevillaTotal;
    const labranzaPercentage = total > 0 ? ((labranzaTotal / total) * 100).toFixed(1) : 0;
    const sevillaPercentage = total > 0 ? ((sevillaTotal / total) * 100).toFixed(1) : 0;

    const data = {
      labels: ['Labranza', 'Sevilla'],
      datasets: [
        {
          data: [labranzaTotal, sevillaTotal],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',  // Verde para Labranza
            'rgba(234, 88, 12, 0.8)',   // Naranja para Sevilla
          ],
          borderColor: [
            'rgb(34, 197, 94)',
            'rgb(234, 88, 12)',
          ],
          borderWidth: 2,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%', // Anillo balanceado
      plugins: {
        legend: {
          display: false, // Ocultamos la leyenda para ganar espacio
        },
        datalabels: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function(context: { label?: string; parsed: number }) {
              const label = context.label || '';
              const value = context.parsed;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              
              return [
                `${label}`,
                `Monto: ${new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                }).format(value)}`,
                `Porcentaje: ${percentage}%`,
              ];
            },
          },
        },
      },
    };

    return (
      <div className="h-full flex flex-col">
        {/* Gráfico - ocupa 70% del espacio */}
        <div className="flex-[0.7] min-h-0 relative py-4">
          <Doughnut ref={chartRef} data={data} options={options} />
        </div>
        
        {/* Información - ocupa 30% del espacio */}
        <div className="flex-[0.3] pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-semibold text-gray-700">Labranza</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                }).format(labranzaTotal)}
              </p>
              <p className="text-base text-green-600 font-semibold">{labranzaPercentage}%</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                <span className="text-sm font-semibold text-gray-700">Sevilla</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                }).format(sevillaTotal)}
              </p>
              <p className="text-base text-orange-600 font-semibold">{sevillaPercentage}%</p>
            </div>
          </div>
          
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Total Consolidado</p>
            <p className="text-xl font-bold text-indigo-600">
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
              }).format(total)}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

SalesDistributionChart.displayName = 'SalesDistributionChart';

export default SalesDistributionChart;
