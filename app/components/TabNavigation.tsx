'use client';

interface TabNavigationProps {
  activeTab: 'Labranza' | 'Sevilla' | 'Consolidados' | 'LibroCompras' | 'Proveedores';
  onTabChange: (tab: 'Labranza' | 'Sevilla' | 'Consolidados' | 'LibroCompras' | 'Proveedores') => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: ('Labranza' | 'Sevilla' | 'Consolidados' | 'LibroCompras' | 'Proveedores')[] = [
    'Labranza', 
    'Sevilla', 
    'Consolidados',
    'LibroCompras',
    'Proveedores'
  ];

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'LibroCompras': return 'Libro de Compras';
      case 'Proveedores': return 'Proveedores';
      default: return tab;
    }
  };

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`
              px-6 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap
              ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {getTabLabel(tab)}
          </button>
        ))}
      </nav>
    </div>
  );
}
