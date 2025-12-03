// Encabezados estándar del Estado de Resultados (EERR)
// Estos encabezados se usan en el Libro de Compras para clasificar los gastos/ingresos

export const ENCABEZADOS_EERR = [
  'INGRESOS OPERACIONALES',
  'GASTOS DE REMUNERACION',
  'GASTOS DE OPERACION',
  'GASTOS DE ADMINISTRACION',
  'OTROS GASTOS',
  'OTROS EGRESOS FUERA DE EXPLOTACION',
] as const;

export type EncabezadoEERR = typeof ENCABEZADOS_EERR[number];

// Unidades de Negocio disponibles
export const UNIDADES_NEGOCIO = [
  'Shell',
  'Distribuidora',
  'Aseo',
  'Ruta 7',
  'U Central',
  'Sin Efecto',
] as const;

export type UnidadNegocio = typeof UNIDADES_NEGOCIO[number];
