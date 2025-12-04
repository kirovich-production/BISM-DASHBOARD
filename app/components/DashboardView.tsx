'use client';

interface DashboardViewProps {
  onNavigate: (view: string) => void; // Ahora acepta cualquier sección dinámica
  selectedUserName?: string;
  availableSections?: string[]; // Secciones disponibles desde Excel (ej: ['sevilla', 'labranza', 'consolidado'])
}

export default function DashboardView({ 
  onNavigate, 
  selectedUserName, 
  availableSections = []
}: DashboardViewProps) {

  // Si no hay usuario seleccionado, mostrar vista inicial
  if (!selectedUserName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          {/* Logo BISM */}
          <div className="mb-8 animate-pulse">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl shadow-2xl transform hover:scale-110 transition-transform duration-300">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            BISM
          </h1>
          <p className="text-xl text-gray-600 mb-2">Dashboard</p>
          <p className="text-sm text-gray-500 mt-4">Selecciona un usuario en &quot;Cargar Datos&quot; para comenzar</p>
        </div>
      </div>
    );
  }

  // Cards estáticas para Libro de Compras (Sevilla y Labranza)
  const libroComprasSectionCards = [
    {
      id: 'sevilla',
      title: 'EERR Sevilla',
      description: 'Estado de resultados detallado de Sevilla',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'labranza',
      title: 'EERR Labranza',
      description: 'Estado de resultados detallado de Labranza',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ];

  // Card de consolidado (estática)
  const consolidadoCard = {
    id: 'consolidado',
    title: 'Consolidado',
    description: 'Vista consolidada Sevilla + Labranza',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
  };

  // Cards de análisis estáticas
  const mesAnualCard = {
    id: 'mes-anual',
    title: 'Comparación Mes-Anual',
    description: 'Análisis comparativo mensual vs anual',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-50',
    iconColor: 'text-teal-600',
  };

  const waterfallCard = {
    id: 'waterfall-charts',
    title: 'Comparativo EBITDA',
    description: 'Evolución comparativa: Consolidado vs. Sevilla vs. Labranza',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  };

  const ebidtaComboCard = {
    id: 'ebitda-combo',
    title: 'EBITDA Combo',
    description: 'EBITDA mensual (barras) + % margen EBITDA (línea)',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'from-indigo-500 to-purple-600',
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  };

  const trimestralCard = {
    id: 'analisis-trimestral',
    title: 'Análisis Trimestral',
    description: 'Comparación por trimestres Q1, Q2, Q3, Q4',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
  };

  // Card de Libro de Compras (reemplaza carga de datos antigua)
  const libroComprasCard = {
    id: 'libro-compras',
    title: 'Libro de Compras',
    description: 'Gestionar libro de compras y proveedores',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
  };

  // Construir array final de cards: todas estáticas para Libro de Compras
  const cards = [
    libroComprasCard, // Libro de Compras primero
    ...libroComprasSectionCards, // Sevilla y Labranza
    consolidadoCard, // Consolidado
    mesAnualCard, // Comparación Mes-Anual
    waterfallCard, // Comparativo EBITDA
    ebidtaComboCard, // EBITDA Combo
    trimestralCard // Análisis Trimestral
  ];

  // Navegación dinámica basada en el id de la card
  const handleCardClick = (cardId: string) => {
    onNavigate(cardId);
  };

  // Formatear nombre de usuario (capitalizar cada palabra)
  const formatUserName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="bg-indigo-600 rounded-xl shadow-lg p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Dashboard - {formatUserName(selectedUserName || '')}
            </h1>
            <p className="text-indigo-100 text-sm md:text-base">
              Resumen general de Balance Sheet
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">


        {/* Secciones - DINÁMICO basado en datos reales */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500 mb-1">Secciones Disponibles</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{availableSections.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
          </div>
          {availableSections.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {availableSections.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
            </p>
          )}
        </div>

        {/* Estado del Sistema - DINÁMICO */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500 mb-1">Estado del Sistema</p>
              <p className="text-lg md:text-xl font-bold text-green-600">
                Activo
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Usuario: {selectedUserName}
          </p>
        </div>
      </div>

      {/* Navigation Cards - DINÁMICO */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
          Acceso Rápido
        </h2>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${cards.length >= 3 ? 'lg:grid-cols-3 xl:grid-cols-4' : 'xl:grid-cols-' + cards.length} gap-4 md:gap-5 max-w-6xl`}>
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-left border-2 border-transparent hover:border-indigo-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.bgColor} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                  <div className={card.iconColor}>{card.icon}</div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {card.title}
              </h3>
              <p className="text-sm text-gray-500">
                {card.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
