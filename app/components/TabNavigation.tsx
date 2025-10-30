'use client';

interface TabNavigationProps {
  activeTab: 'Labranza' | 'Sevilla' | 'Consolidados';
  onTabChange: (tab: 'Labranza' | 'Sevilla' | 'Consolidados') => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: ('Labranza' | 'Sevilla' | 'Consolidados')[] = ['Labranza', 'Sevilla', 'Consolidados'];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`
              px-6 py-3 font-semibold text-sm border-b-2 transition-colors
              ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
