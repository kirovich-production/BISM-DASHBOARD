import { useState, useEffect, useRef } from 'react';
import { formatNumber as formatNum } from '@/lib/formatters';

// Wrapper para mantener compatibilidad con number
const formatNumber = (num: number): string => {
  const result = formatNum(num);
  return result === '-' ? '0' : result;
};

interface EditableCellProps {
  value: number;
  userId: string;
  periodo: string;
  sucursal: string;
  cuenta: string;
  onValueChange: (newValue: number) => void;
}

export default function EditableCell({
  value,
  userId,
  periodo,
  sucursal,
  cuenta,
  onValueChange
}: EditableCellProps) {
  const [displayValue, setDisplayValue] = useState(formatNumber(value));
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remover el símbolo $ y cualquier caracter que no sea número
    const inputValue = e.target.value.replace(/\$\s*/g, '').replace(/[^0-9]/g, '');
    const numericValue = inputValue === '' ? 0 : parseInt(inputValue);
    
    setDisplayValue(formatNumber(numericValue)); // Actualizar display formateado

    // Cancelar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Crear nuevo timer para auto-save
    debounceTimer.current = setTimeout(() => {
      saveValue(numericValue);
    }, 1000); // 1 segundo de debounce
  };

  const saveValue = async (newValue: number) => {
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/valores-manuales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          periodo,
          sucursal,
          cuenta,
          monto: newValue
        })
      });

      const result = await response.json();

      if (result.success) {
        // Notificar al componente padre que el valor cambió
        onValueChange(newValue);
      } else {
        console.error('Error guardando valor:', result.message);
        // Revertir al valor anterior en caso de error
        setDisplayValue(formatNumber(value));
      }
    } catch (error) {
      console.error('Error en saveValue:', error);
      setDisplayValue(formatNumber(value));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full flex justify-end">
      <input
        type="text"
        value={`$ ${displayValue}`}
        onChange={handleChange}
        className={`
          w-32 text-right px-2 py-1 rounded border border-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
          ${isSaving ? 'bg-yellow-50' : 'bg-white'}
        `}
        style={{ paddingRight: isSaving ? '20px' : '0' }}
        placeholder="$ 0"
      />
      {isSaving && (
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-3 w-3 border-2 border-gray-400 rounded-full border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}
