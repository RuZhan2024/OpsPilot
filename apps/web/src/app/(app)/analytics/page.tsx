'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CalendarDays,
  Globe2,
  MonitorSmartphone,
  MousePointerClick,
  PieChart as PieChartIcon,
  Radio,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiRequest } from '@/lib/api-client';

type DashboardSummary = {
  kpis: {
    totalEvents: number;
    upcomingEvents: number;
    completedEvents: number;
    totalRegistrations: number;
    totalAttendees: number;
    averageAttendanceRate: number;
    averageWatchTime: number;
    averageEngagementScore: number;
    peakConcurrentViewers: number;
    openHighRiskRecommendations: number;
  };
  registrationTrend: Array<{
    date: string;
    registrations: number;
    attendees: number;
    peakConcurrentViewers: number;
    averageEngagementScore: number;
  }>;
  topEventsByAttendance: Array<{
    id: string;
    title: string;
    status: string;
    registrations: number;
    attendees: number;
    attendanceRate: number;
    engagementScore: number;
  }>;
  eventReadiness: Array<{
    id: string;
    title: string;
    status: string;
    startTime: string;
    readinessScore: number;
    registrations: number;
    registrationTarget: number;
  }>;
  audienceDomains: Array<{
    domain: string;
    count: number;
  }>;
  deviceBreakdown: BreakdownItem[];
  watchSourceBreakdown: BreakdownItem[];
  geographyBreakdown: BreakdownItem[];
  dropOffTrend: Array<{
    segment: string;
    viewers: number;
    dropOffRate: number;
  }>;
  recentRecommendations: Array<{
    id: string;
    title: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    type: string;
    event: {
      id: string;
      title: string;
      status: string;
      startTime: string;
    };
  }>;
};

type BreakdownItem = {
  label: string;
  count: number;
  percentage: number;
};

const severityStyles = {
  HIGH: 'bg-red-50 text-red-700 ring-red-100',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-100',
  LOW: 'bg-blue-50 text-blue-700 ring-blue-100',
} satisfies Record<'LOW' | 'MEDIUM' | 'HIGH', string>;

const chartPalette = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'];

export default function AnalyticsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiRequest<DashboardSummary>('/dashboard/summary'),
  });

  const trendData = useMemo(
    () =>
      (data?.registrationTrend ?? []).map((point) => ({
        ...point,
        label: formatShortDate(point.date),
      })),
    [data?.registrationTrend],
  );

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Analytics data could not be loaded.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Workspace-level event performance, audience growth and operational
            readiness.
          </p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          {data.kpis.totalEvents} events monitored
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CalendarDays}
          label="Total events"
          value={`${data.kpis.totalEvents}`}
          detail={`${data.kpis.upcomingEvents} upcoming`}
        />
        <KpiCard
          icon={Users}
          label="Registrations"
          value={formatNumber(data.kpis.totalRegistrations)}
          detail={`${formatNumber(data.kpis.totalAttendees)} attendees`}
        />
        <KpiCard
          icon={TrendingUp}
          label="Attendance rate"
          value={`${data.kpis.averageAttendanceRate}%`}
          detail={`${data.kpis.averageWatchTime}m average watch time`}
        />
        <KpiCard
          icon={Radio}
          label="Peak viewers"
          value={formatNumber(data.kpis.peakConcurrentViewers)}
          detail={`${data.kpis.averageEngagementScore} engagement score`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ChartPanel
          title="Registration and attendance trend"
          icon={TrendingUp}
          isEmpty={trendData.length === 0}
          emptyText="No registration trend data is available yet."
        >
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <LineChart data={trendData} margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} stroke="#64748b" />
              <YAxis tickLine={false} stroke="#64748b" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line
                type="monotone"
                dataKey="registrations"
                name="Registrations"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="attendees"
                name="Attendees"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="peakConcurrentViewers"
                name="Peak viewers"
                stroke="#d97706"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Audience domains"
          icon={PieChartIcon}
          isEmpty={data.audienceDomains.length === 0}
          emptyText="No audience domain data is available yet."
        >
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <BarChart
              data={data.audienceDomains}
              layout="vertical"
              margin={{ left: 18, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tickLine={false} stroke="#64748b" />
              <YAxis
                type="category"
                dataKey="domain"
                width={120}
                tickLine={false}
                stroke="#64748b"
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Registrations" fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <ChartPanel
          title="Device mix"
          icon={MonitorSmartphone}
          isEmpty={data.deviceBreakdown.length === 0}
          emptyText="No device breakdown data is available yet."
        >
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <RechartsPieChart>
              <Pie
                data={data.deviceBreakdown}
                dataKey="count"
                nameKey="label"
                innerRadius={58}
                outerRadius={96}
                paddingAngle={2}
              >
                {data.deviceBreakdown.map((item, index) => (
                  <Cell
                    key={item.label}
                    fill={chartPalette[index % chartPalette.length]}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Watch source breakdown"
          icon={MousePointerClick}
          isEmpty={data.watchSourceBreakdown.length === 0}
          emptyText="No watch source data is available yet."
        >
          <BreakdownBarChart
            data={data.watchSourceBreakdown}
            barName="Registrations"
          />
        </ChartPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ChartPanel
          title="Top audience locations"
          icon={Globe2}
          isEmpty={data.geographyBreakdown.length === 0}
          emptyText="No audience location data is available yet."
        >
          <BreakdownBarChart
            data={data.geographyBreakdown}
            barName="Audience"
          />
        </ChartPanel>

        <ChartPanel
          title="Drop-off trend"
          icon={Radio}
          isEmpty={data.dropOffTrend.length === 0}
          emptyText="No drop-off data is available yet."
        >
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <AreaChart data={data.dropOffTrend} margin={{ left: 4, right: 12 }}>
              <defs>
                <linearGradient id="workspaceDropOff" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="segment" tickLine={false} stroke="#64748b" />
              <YAxis tickLine={false} stroke="#64748b" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="viewers"
                name="Viewers"
                stroke="#2563eb"
                fill="url(#workspaceDropOff)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ChartPanel
          title="Engagement trend"
          icon={Radio}
          isEmpty={trendData.length === 0}
          emptyText="No engagement trend data is available yet."
        >
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <AreaChart data={trendData} margin={{ left: 4, right: 12 }}>
              <defs>
                <linearGradient id="workspaceEngagement" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} stroke="#64748b" />
              <YAxis tickLine={false} stroke="#64748b" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="averageEngagementScore"
                name="Average engagement"
                stroke="#0f766e"
                fill="url(#workspaceEngagement)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">
              Top events by attendance
            </h2>
            <BarChart3 className="h-5 w-5 text-emerald-600" />
          </div>
          {data.topEventsByAttendance.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No attendance data is available yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.topEventsByAttendance.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}/analytics`}
                  className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr_96px_96px]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-950">
                      {event.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatEnum(event.status)}
                    </div>
                  </div>
                  <MetricCell label="Attendees" value={`${event.attendees}`} />
                  <MetricCell
                    label="Engagement"
                    value={`${event.engagementScore}`}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">
              Readiness watchlist
            </h2>
            <Target className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="divide-y divide-slate-100">
            {data.eventReadiness.slice(0, 6).map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr_140px]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-950">
                    {event.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {event.registrations} / {event.registrationTarget}{' '}
                    registrations
                  </div>
                </div>
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
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">
              Recent recommendations
            </h2>
          </div>
          {data.recentRecommendations.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No open recommendations.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentRecommendations.map((recommendation) => (
                <Link
                  key={recommendation.id}
                  href={`/events/${recommendation.event.id}/recommendations`}
                  className="block px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${severityStyles[recommendation.severity]}`}
                    >
                      {recommendation.severity}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatEnum(recommendation.type)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-950">
                    {recommendation.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {recommendation.event.title}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <Icon className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 truncate text-sm text-slate-500">{detail}</div>
    </div>
  );
}

function ChartPanel({
  title,
  icon: Icon,
  isEmpty,
  emptyText,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <Icon className="h-5 w-5 text-emerald-600" />
      </div>
      <div className="p-5">
        {isEmpty ? (
          <div className="flex h-72 items-center justify-center rounded-md border border-dashed border-slate-300 px-4 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function BreakdownBarChart({
  data,
  barName,
}: {
  data: BreakdownItem[];
  barName: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300} minWidth={0}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tickLine={false} stroke="#64748b" />
        <YAxis
          type="category"
          dataKey="label"
          width={132}
          tickLine={false}
          stroke="#64748b"
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name={barName} fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="h-8 w-40 animate-pulse rounded-md bg-slate-200" />
          <div className="mt-2 h-5 w-96 max-w-full animate-pulse rounded-md bg-slate-200" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-md bg-white" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-GB').format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const tooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgb(15 23 42 / 0.08)',
  color: '#0f172a',
};
