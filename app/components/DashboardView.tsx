'use client';

import RecentActivity from './RecentActivity';

interface DashboardViewProps {
  onNavigate: (view: string) => void; // Ahora acepta cualquier sección dinámica
  selectedPeriod: string | null;
  periodsCount: number;
  selectedUserName?: string;
  hasData: boolean;
  availableSections?: string[]; // Secciones disponibles desde Excel (ej: ['sevilla', 'labranza', 'consolidado'])
}

export default function DashboardView({ 
  onNavigate, 
  selectedPeriod, 
  periodsCount, 
  selectedUserName, 
  hasData,
  availableSections = []
}: DashboardViewProps) {

  // Si no hay usuario seleccionado o no hay datos, mostrar vista inicial
  if (!selectedUserName || !hasData) {
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
          
          <div className="mt-8 space-y-4">
            {!selectedUserName ? (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-bold text-amber-900">Selecciona un Usuario</h3>
                </div>
                <p className="text-sm text-amber-700">
                  Por favor selecciona un usuario en la parte superior para comenzar.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <h3 className="text-lg font-bold text-blue-900">No hay datos</h3>
                </div>
                <p className="text-sm text-blue-700 mb-4">
                  Usuario: <span className="font-bold">{selectedUserName}</span>
                </p>
                <button
                  onClick={() => onNavigate('upload')}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  Cargar Datos
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Generar cards dinámicamente desde availableSections
  const generateSectionCards = () => {
    const colors = [
      { gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', icon: 'text-indigo-600' },
      { gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', icon: 'text-emerald-600' },
      { gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', icon: 'text-amber-600' },
      { gradient: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', icon: 'text-rose-600' },
      { gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', icon: 'text-cyan-600' },
    ];

    return availableSections
      .filter(section => !['consolidado', 'consolidados'].includes(section.toLowerCase()))
      .map((section, index) => {
        const colorScheme = colors[index % colors.length];
        return {
          id: section.toLowerCase(),
          title: `EERR ${section.charAt(0).toUpperCase() + section.slice(1)}`,
          description: `Estado de resultados detallado de ${section}`,
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ),
          color: colorScheme.gradient,
          bgColor: colorScheme.bg,
          iconColor: colorScheme.icon,
        };
      });
  };

  // Card de consolidado (si existe)
  const getConsolidadoCard = () => {
    const hasConsolidado = availableSections.some(s => 
      ['consolidado', 'consolidados'].includes(s.toLowerCase())
    );
    
    if (!hasConsolidado) return null;

    return {
      id: 'consolidado',
      title: 'Consolidado',
      description: 'Vista consolidada por secciones',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    };
  };

  // Card de carga de datos (siempre disponible)
  const uploadCard = {
    id: 'upload',
    title: 'Cargar Datos',
    description: 'Subir nuevos períodos financieros',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
  };

  // Construir array final de cards: secciones + consolidado (si existe) + upload
  const sectionCards = generateSectionCards();
  const consolidadoCard = getConsolidadoCard();
  const cards = consolidadoCard 
    ? [...sectionCards, consolidadoCard, uploadCard]
    : [...sectionCards, uploadCard];

  // Navegación dinámica basada en el id de la card
  const handleCardClick = (cardId: string) => {
    onNavigate(cardId);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Dashboard
            </h1>
            <p className="text-indigo-100 text-sm md:text-base">
              Resumen general de Balance Sheet
            </p>
          </div>
          
          {selectedPeriod && (
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
              <p className="text-xs text-indigo-100 mb-1">Período Actual</p>
              <p className="text-lg font-semibold">{selectedPeriod}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Períodos Disponibles - DINÁMICO */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500 mb-1">Períodos Disponibles</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{periodsCount}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

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
        <div className={`grid grid-cols-1 md:grid-cols-2 ${cards.length >= 3 ? 'xl:grid-cols-4' : 'xl:grid-cols-' + cards.length} gap-4 md:gap-6`}>
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

      {/* Recent Activity */}
      <RecentActivity userName={selectedUserName} />
    </div>
  );
}
