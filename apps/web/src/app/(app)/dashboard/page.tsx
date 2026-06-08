'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Radio, Users } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

type DashboardSummary = {
  kpis: {
    totalEvents: number;
    upcomingEvents: number;
    totalRegistrations: number;
    totalAttendees: number;
    averageAttendanceRate: number;
    averageEngagementScore: number;
    peakConcurrentViewers: number;
    openHighRiskRecommendations: number;
  };
  eventReadiness: Array<{
    id: string;
    title: string;
    status: string;
    readinessScore: number;
    registrations: number;
    registrationTarget: number;
  }>;
  recentRecommendations: Array<{
    id: string;
    title: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    type: string;
    event: {
      title: string;
    };
  }>;
};

const kpiConfig = [
  {
    key: 'totalEvents',
    label: 'Total events',
    icon: CalendarDays,
  },
  {
    key: 'totalRegistrations',
    label: 'Registrations',
    icon: Users,
  },
  {
    key: 'peakConcurrentViewers',
    label: 'Peak viewers',
    icon: Radio,
  },
  {
    key: 'openHighRiskRecommendations',
    label: 'High-risk items',
    icon: AlertTriangle,
  },
] as const;

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiRequest<DashboardSummary>('/dashboard/summary'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Workspace performance, event readiness and operational risks.
          </p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          Seed data connected
        </div>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Dashboard data could not be loaded.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpiConfig.map((item) => {
              const Icon = item.icon;
              const value = data.kpis[item.key];

              return (
                <div
                  key={item.key}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-500">
                      {item.label}
                    </div>
                    <Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-slate-950">
                    {value}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-950">
                  Event readiness
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {data.eventReadiness.slice(0, 6).map((event) => (
                  <div
                    key={event.id}
                    className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_140px_120px]"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {event.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {event.registrations} / {event.registrationTarget}{' '}
                        registrations
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">{event.status}</div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>Readiness</span>
                        <span>{event.readinessScore}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-emerald-600"
                          style={{ width: `${event.readinessScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-950">
                  Recent recommendations
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {data.recentRecommendations.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-slate-500">
                    No open recommendations.
                  </div>
                ) : (
                  data.recentRecommendations.map((recommendation) => (
                    <div key={recommendation.id} className="px-5 py-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                          {recommendation.severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {recommendation.type.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        {recommendation.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {recommendation.event.title}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
