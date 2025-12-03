// Mapeo de cuentas contables a Encabezados EERR
// Las cuentas se evalúan por prefijo (por ejemplo, "51" matchea "510101", "511234", etc.)

export const CUENTAS_A_ENCABEZADOS: { [cuentaPrefix: string]: string } = {
  // INGRESOS OPERACIONALES
  'Ventas': 'INGRESOS OPERACIONALES',
  'Costo de venta': 'INGRESOS OPERACIONALES',
  'Transbank': 'INGRESOS OPERACIONALES',
  'Bonificacion por tramo': 'INGRESOS OPERACIONALES',
  
  // GASTOS DE REMUNERACION
  'Sueldo Personal': 'GASTOS DE REMUNERACION',
  'Seguro de Cesantia': 'GASTOS DE REMUNERACION',
  'Seguro de Accidentes Trabajo': 'GASTOS DE REMUNERACION',
  'Seguro Invalidez y Sobrevivencia': 'GASTOS DE REMUNERACION',
  'Finiquitos': 'GASTOS DE REMUNERACION',
  'Honorarios BH': 'GASTOS DE REMUNERACION',
  'Honorarios Factura BSM': 'GASTOS DE REMUNERACION',
  'Provision de Vacaciones': 'GASTOS DE REMUNERACION',
  'Honorarios Administracion': 'GASTOS DE REMUNERACION',
  
  // GASTOS DE OPERACION
  'Consumo de Electricidad': 'GASTOS DE OPERACION',
  'Consumo de Agua': 'GASTOS DE OPERACION',
  'Comunicaciones': 'GASTOS DE OPERACION',
  'Articulos de Aseo': 'GASTOS DE OPERACION',
  'Mantencion y Reparacion': 'GASTOS DE OPERACION',
  'Gastos Generales': 'GASTOS DE OPERACION',
  'Servicios Externos': 'GASTOS DE OPERACION',
  'Caja Chica': 'GASTOS DE OPERACION',
  'Sin Clasificar': 'GASTOS DE OPERACION',
  'Sin efecto': 'GASTOS DE OPERACION',
  
  // GASTOS DE ADMINISTRACION
  'Materiales y Utiles de Oficina': 'GASTOS DE ADMINISTRACION',
  'Publicidad y Propaganda BSM': 'GASTOS DE ADMINISTRACION',
  'Licencias y Software': 'GASTOS DE ADMINISTRACION',
  'Gastos Notariales': 'GASTOS DE ADMINISTRACION',
  'Gastos Bancarios': 'GASTOS DE ADMINISTRACION',
  'Contribuciones': 'GASTOS DE ADMINISTRACION',
  'Patentes Municipales': 'GASTOS DE ADMINISTRACION',
  'Gastos generales': 'GASTOS DE ADMINISTRACION',
  'Recaudacion y Sencillo': 'GASTOS DE ADMINISTRACION',
  'Seguros': 'GASTOS DE ADMINISTRACION',
  'Publicidad y Propaganda': 'GASTOS DE ADMINISTRACION',
  
  // OTROS GASTOS
  'Arriendo': 'OTROS GASTOS',
  'Gestion BSM': 'OTROS GASTOS',
  'Supervisor punto de venta (S.M)': 'OTROS GASTOS',
  
  // OTROS EGRESOS FUERA DE EXPLOTACION
  'Pago Cuota Leasing': 'OTROS EGRESOS FUERA DE EXPLOTACION',
  'Pago Cuota creditos Bancarios': 'OTROS EGRESOS FUERA DE EXPLOTACION',
  'Directorio': 'OTROS EGRESOS FUERA DE EXPLOTACION',
  
  // Prefijos numéricos (mantener para compatibilidad)
  '41': 'INGRESOS OPERACIONALES',
  '42': 'INGRESOS OPERACIONALES',
  '60': 'GASTOS DE REMUNERACION',
  '51': 'GASTOS DE OPERACION',
  '52': 'GASTOS DE OPERACION',
  '61': 'GASTOS DE ADMINISTRACION',
  '62': 'GASTOS DE ADMINISTRACION',
  '63': 'OTROS GASTOS',
  '64': 'OTROS GASTOS',
  '65': 'OTROS EGRESOS FUERA DE EXPLOTACION',
  '66': 'OTROS EGRESOS FUERA DE EXPLOTACION',
};

/**
 * Asigna un encabezado EERR basándose en la cuenta contable
 * @param cuenta - Número de cuenta contable (ej: "510101")
 * @returns Encabezado EERR correspondiente o null si no se encuentra
 */
export function asignarEncabezadoPorCuenta(cuenta: string): string | null {
  if (!cuenta || cuenta.trim() === '') return null;
  
  const cuentaClean = cuenta.trim();
  
  // 1. Buscar coincidencia exacta primero (para nombres descriptivos de cuenta)
  if (CUENTAS_A_ENCABEZADOS[cuentaClean]) {
    return CUENTAS_A_ENCABEZADOS[cuentaClean];
  }
  
  // 2. Buscar coincidencia case-insensitive
  const cuentaLower = cuentaClean.toLowerCase();
  for (const key of Object.keys(CUENTAS_A_ENCABEZADOS)) {
    if (key.toLowerCase() === cuentaLower) {
      return CUENTAS_A_ENCABEZADOS[key];
    }
  }
  
  // 3. Buscar match por prefijos numéricos (de más específico a menos específico)
  const numericPrefixes = Object.keys(CUENTAS_A_ENCABEZADOS)
    .filter(k => /^\d+$/.test(k)) // Solo prefijos numéricos
    .sort((a, b) => b.length - a.length);
  
  for (const prefix of numericPrefixes) {
    if (cuentaClean.startsWith(prefix)) {
      return CUENTAS_A_ENCABEZADOS[prefix];
    }
  }
  
  return null; // No se encontró clasificación
}

/**
 * Obtiene todas las cuentas asociadas a un encabezado EERR
 * @param encabezado - Nombre del encabezado EERR
 * @returns Array de nombres de cuentas asociadas al encabezado
 */
export function obtenerCuentasPorEncabezado(encabezado: string): string[] {
  if (!encabezado) return [];
  
  const cuentas: string[] = [];
  
  for (const [cuenta, enc] of Object.entries(CUENTAS_A_ENCABEZADOS)) {
    // Excluir prefijos numéricos (solo incluir nombres descriptivos)
    if (enc === encabezado && !/^\d+$/.test(cuenta)) {
      cuentas.push(cuenta);
    }
  }
  
  return cuentas.sort();
}
