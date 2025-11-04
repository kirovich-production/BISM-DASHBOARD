'use client';

import { useEffect, useState } from 'react';

interface Activity {
  id: string;
  type: 'automatic' | 'manual';
  fileName: string;
  period: string;
  periodLabel: string;
  version: number;
  sections: string[];
  recordsCount: number;
  timestamp: Date;
}

interface RecentActivityProps {
  userName?: string;
}

export default function RecentActivity({ userName }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userName) {
      fetchActivities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]);

  const fetchActivities = async () => {
    if (!userName) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/recent-activity?userName=${encodeURIComponent(userName)}`);
      const data = await response.json();
      
      if (data.success) {
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Error al cargar actividades:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const groupedActivities = activities.reduce((acc, activity) => {
    const type = activity.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(activity);
    return acc;
  }, {} as Record<string, Activity[]>);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="mb-6">
        <h3 className="text-lg md:text-xl font-bold text-gray-900">
          Actividad Reciente
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Últimas actualizaciones de datos
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>No hay actividad reciente</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Carga Automática */}
          {groupedActivities.automatic && groupedActivities.automatic.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    Carga Automática
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      Diaria
                    </span>
                  </h4>
                </div>
              </div>

              <div className="space-y-2 ml-0 md:ml-11">
                {groupedActivities.automatic.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.periodLabel}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {activity.recordsCount} registros • {activity.sections.join(', ')}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 mt-2 sm:mt-0 sm:ml-4 whitespace-nowrap">
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Carga Manual */}
          {groupedActivities.manual && groupedActivities.manual.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <svg
                    className="w-5 h-5 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    Carga Manual
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      Bajo demanda
                    </span>
                  </h4>
                </div>
              </div>

              <div className="space-y-2 ml-0 md:ml-11">
                {groupedActivities.manual.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.periodLabel}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {activity.recordsCount} registros • {activity.sections.join(', ')}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 mt-2 sm:mt-0 sm:ml-4 whitespace-nowrap">
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
