'use client';

import { useMemo } from 'react';
import type { ChartDataPoint } from './useChartData';

export interface MonthlySalesDataPoint {
  month: string;
  labranza: number;
  sevilla: number;
  consolidado: number;
}

export interface QuarterOption {
  label: string;
  value: string;
  months: string[];
}

export interface MonthOption {
  label: string;
  value: string;
}

export function useMonthlySalesData(data: ChartDataPoint[]) {
  // Datos mensuales (NO acumulados, son los datos originales)
  const monthlyData: MonthlySalesDataPoint[] = useMemo(() => {
    return data.map(d => ({
      month: d.month,
      labranza: d.labranza,
      sevilla: d.sevilla,
      consolidado: d.consolidado,
    }));
  }, [data]);

  // Generar opciones de trimestres móviles
  const quarterOptions: QuarterOption[] = useMemo(() => {
    if (data.length < 3) return [];

    const quarters: QuarterOption[] = [];
    
    for (let i = 0; i <= data.length - 3; i++) {
      const monthsInQuarter = [data[i].month, data[i + 1].month, data[i + 2].month];
      const label = `${data[i].month} - ${data[i + 2].month}`;
      
      quarters.push({
        label,
        value: `${i}`,
        months: monthsInQuarter,
      });
    }

    return quarters;
  }, [data]);

  // Generar opciones de meses para comparación
  const monthOptions: MonthOption[] = useMemo(() => {
    return data.map(d => ({
      label: d.month,
      value: d.month,
    }));
  }, [data]);

  // Filtrar datos por trimestre móvil
  const filterByQuarter = (quarterValue: string): MonthlySalesDataPoint[] => {
    const quarter = quarterOptions.find(q => q.value === quarterValue);
    if (!quarter) return monthlyData;

    return monthlyData.filter(d => quarter.months.includes(d.month));
  };

  // Filtrar datos para comparación de dos meses
  const filterByComparison = (month1: string, month2: string): MonthlySalesDataPoint[] => {
    if (!month1 || !month2) return monthlyData;

    return monthlyData.filter(d => d.month === month1 || d.month === month2);
  };

  return {
    monthlyData,
    quarterOptions,
    monthOptions,
    filterByQuarter,
    filterByComparison,
  };
}
