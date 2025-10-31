'use client';

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  onExport?: () => void;
  /** Extra classes to apply to the outer container */
  className?: string;
}

export default function ChartContainer({ title, children, onExport, className }: ChartContainerProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 md:p-6 flex flex-col ${className || ''}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 md:mb-4 gap-3 flex-shrink-0">
        <h3 className="text-base md:text-lg font-semibold text-gray-900">{title}</h3>
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Exportar PNG</span>
            <span className="sm:hidden">PNG</span>
          </button>
        )}
      </div>
      <div className="relative flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
