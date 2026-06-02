'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Edit,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type EventStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

type EventType =
  | 'WEBINAR'
  | 'PRODUCT_LAUNCH'
  | 'TRAINING'
  | 'INTERNAL_LIVESTREAM'
  | 'TOWN_HALL'
  | 'CUSTOMER_ONBOARDING';

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  eventType: EventType;
  status: EventStatus;
  startTime: string;
  endTime: string;
  timezone: string;
  registrationTarget: number;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  accessRules: Array<{
    id: string;
    type: string;
    domainWhitelist: string[];
    requiresApproval: boolean;
  }>;
  contentModules: Array<{
    id: string;
    type: string;
    title: string;
    isVisible: boolean;
  }>;
  registrations: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
  }>;
  recommendations: Array<{
    id: string;
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    title: string;
    status: 'OPEN' | 'RESOLVED';
  }>;
  analyticsSnapshots: Array<{
    id: string;
    date: string;
    registrations: number;
    attendees: number;
    averageWatchTime: number;
    engagementScore: number;
  }>;
};

type Readiness = {
  eventId: string;
  score: number;
  status: 'READY' | 'NEEDS_WORK' | 'AT_RISK';
  checklist: Array<{
    key: string;
    label: string;
    completed: boolean;
    points: number;
  }>;
};

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
};

const statusStyles: Record<EventStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-100',
  LIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  COMPLETED: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-100',
};

const readinessStyles: Record<Readiness['status'], string> = {
  READY: 'text-emerald-700 bg-emerald-50 ring-emerald-100',
  NEEDS_WORK: 'text-amber-700 bg-amber-50 ring-amber-100',
  AT_RISK: 'text-red-700 bg-red-50 ring-red-100',
};

const typeLabels: Record<EventType, string> = {
  WEBINAR: 'Webinar',
  PRODUCT_LAUNCH: 'Product Launch',
  TRAINING: 'Training',
  INTERNAL_LIVESTREAM: 'Internal Livestream',
  TOWN_HALL: 'Town Hall',
  CUSTOMER_ONBOARDING: 'Customer Onboarding',
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { user } = useAuth();
  const canEditEvent = user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const eventQuery = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiRequest<EventDetail>(`/events/${eventId}`),
    enabled: Boolean(eventId),
  });

  const readinessQuery = useQuery({
    queryKey: ['events', eventId, 'readiness'],
    queryFn: () => apiRequest<Readiness>(`/events/${eventId}/readiness`),
    enabled: Boolean(eventId),
  });

  const auditLogsQuery = useQuery({
    queryKey: ['events', eventId, 'audit-logs'],
    queryFn: () => apiRequest<AuditLog[]>(`/events/${eventId}/audit-logs`),
    enabled: Boolean(eventId),
  });

  if (eventQuery.isLoading) {
    return <EventDetailSkeleton />;
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Event could not be loaded.
      </div>
    );
  }

  const event = eventQuery.data;
  const readiness = readinessQuery.data;
  const latestSnapshot = event.analyticsSnapshots.at(-1);
  const openRecommendations = event.recommendations.filter(
    (recommendation) => recommendation.status === 'OPEN',
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Events
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} />
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                {typeLabels[event.eventType]}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-950">
              {event.title}
            </h1>
            {event.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {event.description}
              </p>
            ) : null}
          </div>

          <div className="grid min-w-64 gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            {canEditEvent ? (
              <Link
                href={`/events/${event.id}/edit`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                <Edit className="h-4 w-4" aria-hidden="true" />
                Edit event
              </Link>
            ) : null}
            <Link
              href={`/events/${event.id}/audience`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Audience access
            </Link>
            <Link
              href={`/events/${event.id}/content`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Content builder
            </Link>
            <MetricLine
              label="Owner"
              value={event.createdBy.name}
              subValue={event.createdBy.email}
            />
            <MetricLine
              label="Start time"
              value={formatDate(event.startTime)}
              subValue={event.timezone}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon={Users}
          label="Registrations"
          value={`${latestSnapshot?.registrations ?? event.registrations.length}`}
          detail={`Target ${event.registrationTarget}`}
        />
        <OverviewCard
          icon={BarChart3}
          label="Attendees"
          value={`${latestSnapshot?.attendees ?? 0}`}
          detail={`${latestSnapshot?.engagementScore ?? 0} engagement score`}
        />
        <OverviewCard
          icon={ShieldCheck}
          label="Access rules"
          value={`${event.accessRules.length}`}
          detail={event.accessRules[0]?.type.replaceAll('_', ' ') ?? 'Not set'}
        />
        <OverviewCard
          icon={Sparkles}
          label="Open recommendations"
          value={`${openRecommendations.length}`}
          detail="Operational risk items"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">
              Readiness score
            </h2>
            {readiness ? (
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${readinessStyles[readiness.status]}`}
              >
                {readiness.status.replaceAll('_', ' ')}
              </span>
            ) : null}
          </div>
          {readinessQuery.isLoading ? (
            <div className="p-5">
              <div className="h-28 animate-pulse rounded-md bg-slate-100" />
            </div>
          ) : readiness ? (
            <div className="p-5">
              <div className="mb-5 flex items-end gap-3">
                <div className="text-4xl font-semibold text-slate-950">
                  {readiness.score}
                </div>
                <div className="pb-1 text-sm text-slate-500">/ 100</div>
              </div>
              <div className="mb-5 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-emerald-600"
                  style={{ width: `${readiness.score}%` }}
                />
              </div>
              <div className="space-y-3">
                {readiness.checklist.map((item) => (
                  <div key={item.key} className="flex items-start gap-3">
                    {item.completed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    ) : (
                      <CircleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800">
                        {item.label}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.points} points
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 text-sm text-slate-500">
              Readiness data is unavailable.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">
              Setup overview
            </h2>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-3">
            <SetupPanel
              title="Audience"
              icon={ShieldCheck}
              count={event.accessRules.length}
              items={event.accessRules.map((rule) => ({
                id: rule.id,
                label: rule.type.replaceAll('_', ' '),
                detail:
                  rule.domainWhitelist.length > 0
                    ? rule.domainWhitelist.join(', ')
                    : rule.requiresApproval
                      ? 'Approval required'
                      : 'Configured',
              }))}
              empty="No access rule"
            />
            <SetupPanel
              title="Content"
              icon={FileText}
              count={event.contentModules.length}
              items={event.contentModules.slice(0, 4).map((module) => ({
                id: module.id,
                label: module.title,
                detail: module.type.replaceAll('_', ' '),
              }))}
              empty="No content modules"
            />
            <SetupPanel
              title="Recommendations"
              icon={Sparkles}
              count={openRecommendations.length}
              items={openRecommendations.slice(0, 4).map((recommendation) => ({
                id: recommendation.id,
                label: recommendation.title,
                detail: recommendation.severity,
              }))}
              empty="No open items"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">
            Activity timeline
          </h2>
          <CalendarClock className="h-4 w-4 text-slate-400" />
        </div>
        {auditLogsQuery.isLoading ? (
          <div className="p-5">
            <div className="h-24 animate-pulse rounded-md bg-slate-100" />
          </div>
        ) : auditLogsQuery.isError ? (
          <div className="p-5 text-sm text-red-600">
            Activity could not be loaded.
          </div>
        ) : auditLogsQuery.data?.length ? (
          <div className="divide-y divide-slate-100">
            {auditLogsQuery.data.slice(0, 8).map((log) => (
              <div key={log.id} className="grid gap-3 px-5 py-4 md:grid-cols-[180px_1fr_180px]">
                <div className="text-sm text-slate-500">
                  {formatDate(log.createdAt)}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {formatEnum(log.action)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {log.entityType}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {log.actor?.name ?? 'System'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-sm text-slate-500">
            No activity recorded for this event.
          </div>
        )}
      </section>
    </div>
  );
}

function OverviewCard({
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
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <Icon className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 truncate text-sm text-slate-500">{detail}</div>
    </div>
  );
}

function MetricLine({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{subValue}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusStyles[status]}`}
    >
      {formatEnum(status)}
    </span>
  );
}

function SetupPanel({
  title,
  icon: Icon,
  count,
  items,
  empty,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  items: Array<{ id: string; label: string; detail: string }>;
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-slate-500">{empty}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id}>
              <div className="truncate text-sm font-medium text-slate-800">
                {item.label}
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-28 animate-pulse rounded-md bg-slate-200" />
      <div className="h-48 animate-pulse rounded-lg bg-white" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
