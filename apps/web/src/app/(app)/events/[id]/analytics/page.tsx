'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Clock,
  MessageSquareText,
  Radio,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiRequest } from '@/lib/api-client';

type EventStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

type EventType =
  | 'WEBINAR'
  | 'PRODUCT_LAUNCH'
  | 'TRAINING'
  | 'INTERNAL_LIVESTREAM'
  | 'TOWN_HALL'
  | 'CUSTOMER_ONBOARDING';

type EventAnalytics = {
  event: {
    id: string;
    title: string;
    eventType: EventType;
    status: EventStatus;
    startTime: string;
    endTime: string;
    timezone: string;
    registrationTarget: number;
  };
  totals: {
    registrations: number;
    attendees: number;
    attendanceRate: number;
    averageWatchTime: number;
    engagementScore: number;
    pollParticipationRate: number;
    qaCount: number;
    feedbackScore: number;
  };
  setup: {
    accessRuleCount: number;
    contentModuleCount: number;
    pollCount: number;
    questionCount: number;
    feedbackCount: number;
  };
  progress: {
    registrationTarget: number;
    registrationProgress: number;
  };
  audienceDomains: Array<{
    domain: string;
    count: number;
  }>;
  latestSnapshot: EventTimeseriesPoint | null;
};

type EventTimeseriesPoint = {
  id: string;
  date: string;
  registrations: number;
  attendees: number;
  attendanceRate: number;
  averageWatchTime: number;
  engagementScore: number;
  pollParticipationRate: number;
  qaCount: number;
  feedbackScore: number;
};

const eventTypeLabels: Record<EventType, string> = {
  WEBINAR: 'Webinar',
  PRODUCT_LAUNCH: 'Product Launch',
  TRAINING: 'Training',
  INTERNAL_LIVESTREAM: 'Internal Livestream',
  TOWN_HALL: 'Town Hall',
  CUSTOMER_ONBOARDING: 'Customer Onboarding',
};

const statusStyles: Record<EventStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-100',
  LIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  COMPLETED: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-100',
};

export default function EventAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const analyticsQuery = useQuery({
    queryKey: ['events', eventId, 'analytics'],
    queryFn: () => apiRequest<EventAnalytics>(`/events/${eventId}/analytics`),
    enabled: Boolean(eventId),
  });

  const timeseriesQuery = useQuery({
    queryKey: ['events', eventId, 'analytics', 'timeseries'],
    queryFn: () =>
      apiRequest<EventTimeseriesPoint[]>(
        `/events/${eventId}/analytics/timeseries`,
      ),
    enabled: Boolean(eventId),
  });

  const chartData = useMemo(
    () =>
      (timeseriesQuery.data ?? []).map((point) => ({
        ...point,
        label: formatShortDate(point.date),
      })),
    [timeseriesQuery.data],
  );

  if (analyticsQuery.isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (analyticsQuery.isError || !analyticsQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Analytics could not be loaded.
      </div>
    );
  }

  const analytics = analyticsQuery.data;
  const hasTimeseries = chartData.length > 0;
  const progressWidth = Math.min(analytics.progress.registrationProgress, 100);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Event detail
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusStyles[analytics.event.status]}`}
              >
                {formatEnum(analytics.event.status)}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                {eventTypeLabels[analytics.event.eventType]}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Event analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {analytics.event.title}
            </p>
          </div>

          <div className="min-w-72 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Registration target
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {analytics.totals.registrations} of{' '}
                  {analytics.progress.registrationTarget}
                </div>
              </div>
              <div className="text-2xl font-semibold text-slate-950">
                {analytics.progress.registrationProgress}%
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-emerald-600"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Registrations"
          value={formatNumber(analytics.totals.registrations)}
          detail={`${analytics.totals.attendanceRate}% attendance rate`}
        />
        <KpiCard
          icon={Radio}
          label="Attendees"
          value={formatNumber(analytics.totals.attendees)}
          detail={`${analytics.totals.pollParticipationRate}% poll participation`}
        />
        <KpiCard
          icon={Clock}
          label="Average watch time"
          value={formatMinutes(analytics.totals.averageWatchTime)}
          detail="Per attendee"
        />
        <KpiCard
          icon={Activity}
          label="Engagement score"
          value={`${analytics.totals.engagementScore}`}
          detail={`${analytics.totals.feedbackScore} feedback score`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ChartPanel
          title="Registration and attendance trend"
          icon={TrendingUp}
          isLoading={timeseriesQuery.isLoading}
          isError={timeseriesQuery.isError}
          isEmpty={!hasTimeseries}
          emptyText="No analytics snapshots have been recorded for this event."
        >
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <LineChart data={chartData} margin={{ left: 4, right: 12 }}>
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
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Audience domains"
          icon={Users}
          isEmpty={analytics.audienceDomains.length === 0}
          emptyText="No audience domain data is available yet."
        >
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <BarChart
              data={analytics.audienceDomains}
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

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartPanel
          title="Engagement and watch time"
          icon={BarChart3}
          isLoading={timeseriesQuery.isLoading}
          isError={timeseriesQuery.isError}
          isEmpty={!hasTimeseries}
          emptyText="Engagement trend data will appear after snapshots are seeded."
        >
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <AreaChart data={chartData} margin={{ left: 4, right: 12 }}>
              <defs>
                <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} stroke="#64748b" />
              <YAxis tickLine={false} stroke="#64748b" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area
                type="monotone"
                dataKey="engagementScore"
                name="Engagement score"
                stroke="#0f766e"
                fill="url(#engagementFill)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="averageWatchTime"
                name="Watch time"
                stroke="#d97706"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">
              Operational signals
            </h2>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <SignalCard
              icon={Target}
              label="Access rules"
              value={analytics.setup.accessRuleCount}
            />
            <SignalCard
              icon={BarChart3}
              label="Content modules"
              value={analytics.setup.contentModuleCount}
            />
            <SignalCard
              icon={Radio}
              label="Polls"
              value={analytics.setup.pollCount}
            />
            <SignalCard
              icon={MessageSquareText}
              label="Q&A"
              value={analytics.setup.questionCount}
            />
          </div>
          <div className="border-t border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                Feedback records
              </span>
              <span className="font-semibold text-slate-950">
                {analytics.setup.feedbackCount}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Q&A count</span>
              <span className="font-semibold text-slate-950">
                {analytics.totals.qaCount}
              </span>
            </div>
          </div>
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
  isLoading = false,
  isError = false,
  isEmpty = false,
  emptyText,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
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
        {isLoading ? (
          <div className="h-72 animate-pulse rounded-md bg-slate-100" />
        ) : isError ? (
          <div className="flex h-72 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-center text-sm text-red-700">
            Chart data could not be loaded.
          </div>
        ) : isEmpty ? (
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

function SignalCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-4 w-4 text-emerald-600" />
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {value}
        </span>
      </div>
      <div className="mt-3 text-sm font-medium text-slate-700">{label}</div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-28 animate-pulse rounded-md bg-slate-200" />
      <div className="h-40 animate-pulse rounded-lg bg-white" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="h-96 animate-pulse rounded-lg bg-white" />
        <div className="h-96 animate-pulse rounded-lg bg-white" />
      </div>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-GB').format(value);
}

function formatMinutes(value: number) {
  return `${value}m`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

const tooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgb(15 23 42 / 0.08)',
  color: '#0f172a',
};
