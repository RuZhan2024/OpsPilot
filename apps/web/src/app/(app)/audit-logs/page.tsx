'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CalendarClock,
  CircleUserRound,
  FileClock,
  Filter,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type AuditLog = {
  id: string;
  workspaceId: string;
  actorUserId: string | null;
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

const allEntityTypes = 'ALL';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [entityType, setEntityType] = useState(allEntityTypes);
  const [searchTerm, setSearchTerm] = useState('');
  const isAdmin = user?.role === 'ADMIN';

  const auditLogsQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiRequest<AuditLog[]>('/audit-logs'),
    enabled: isAdmin,
    retry: false,
  });

  const auditLogs = useMemo(
    () => auditLogsQuery.data ?? [],
    [auditLogsQuery.data],
  );

  const entityTypes = useMemo(
    () => [
      allEntityTypes,
      ...Array.from(new Set(auditLogs.map((log) => log.entityType))).sort(),
    ],
    [auditLogs],
  );

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const matchesEntity =
        entityType === allEntityTypes || log.entityType === entityType;

      if (!matchesEntity) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        log.action,
        log.entityType,
        log.entityId,
        log.actor?.name,
        log.actor?.email,
        getMetadataLabel(log.metadata),
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [auditLogs, entityType, searchTerm]);

  const summary = useMemo(() => buildSummary(auditLogs), [auditLogs]);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5" aria-hidden="true" />
            <div>
              <div className="font-semibold">Admin access required</div>
              <p className="mt-1 leading-6">
                Workspace audit logs include cross-user operational activity and
                are only available to Admin users.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {auditLogsQuery.isLoading ? (
        <AuditLogsSkeleton />
      ) : auditLogsQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Audit logs could not be loaded.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={FileClock}
              label="Audit entries"
              value={summary.total}
              detail="Latest workspace activity"
            />
            <SummaryCard
              icon={Activity}
              label="Event actions"
              value={summary.eventActions}
              detail="Event-related operations"
            />
            <SummaryCard
              icon={UserRoundCog}
              label="User actions"
              value={summary.userActions}
              detail="Actor-attributed entries"
            />
            <SummaryCard
              icon={ShieldCheck}
              label="System actions"
              value={summary.systemActions}
              detail="Automated operations"
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Activity timeline
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Filter workspace operations by entity type, actor or action.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="relative block md:w-72">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Search audit logs"
                  />
                </label>

                <label className="relative block md:w-56">
                  <Filter
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <select
                    value={entityType}
                    onChange={(event) => setEntityType(event.target.value)}
                    className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    {entityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type === allEntityTypes ? 'All entities' : type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <EmptyState />
            ) : filteredLogs.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-sm font-medium text-slate-900">
                  No audit logs match your filters
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Try another entity type or search term.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <AuditLogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review workspace changes, recommendation actions and operational
          events.
        </p>
      </div>
      <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
        Admin-only activity
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
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

function AuditLogRow({ log }: { log: AuditLog }) {
  const metadataLabel = getMetadataLabel(log.metadata);

  return (
    <article className="grid gap-4 px-5 py-4 xl:grid-cols-[180px_1fr_220px]">
      <div className="flex items-start gap-3 text-sm text-slate-500 xl:block">
        <CalendarClock className="mt-0.5 h-4 w-4 text-slate-400 xl:hidden" />
        <div>{formatDate(log.createdAt)}</div>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {formatEnum(log.action)}
          </span>
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
            {log.entityType}
          </span>
        </div>

        <div className="text-sm font-medium text-slate-950">
          {metadataLabel || log.entityId}
        </div>
        <div className="mt-1 break-all text-xs text-slate-500">
          Entity ID: {log.entityId}
        </div>
        {log.metadata ? (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">
            {formatMetadata(log.metadata)}
          </div>
        ) : null}
      </div>

      <div className="flex items-start gap-3 xl:justify-end">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500">
          <CircleUserRound className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 xl:text-right">
          <div className="truncate text-sm font-medium text-slate-900">
            {log.actor?.name ?? 'System'}
          </div>
          <div className="mt-1 truncate text-xs text-slate-500">
            {log.actor?.email ?? 'Automated action'}
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        <FileClock className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="mt-4 text-sm font-medium text-slate-900">
        No audit logs yet
      </div>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Key actions such as event updates, access rule changes and
        recommendation resolution will appear here.
      </p>
    </div>
  );
}

function AuditLogsSkeleton() {
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
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="h-20 border-b border-slate-200" />
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

function buildSummary(logs: AuditLog[]) {
  return logs.reduce(
    (summary, log) => {
      summary.total += 1;

      if (log.entityType === 'Event' || getMetadataString(log.metadata, 'eventId')) {
        summary.eventActions += 1;
      }

      if (log.actor) {
        summary.userActions += 1;
      } else {
        summary.systemActions += 1;
      }

      return summary;
    },
    {
      total: 0,
      eventActions: 0,
      userActions: 0,
      systemActions: 0,
    },
  );
}

function getMetadataLabel(metadata: Record<string, unknown> | null) {
  if (!metadata) {
    return '';
  }

  return (
    getMetadataString(metadata, 'eventTitle') ||
    getMetadataString(metadata, 'title') ||
    getMetadataString(metadata, 'name') ||
    getMetadataString(metadata, 'email')
  );
}

function getMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === 'string' ? value : '';
}

function formatMetadata(metadata: Record<string, unknown>) {
  const compact = JSON.stringify(metadata);

  if (compact.length <= 180) {
    return compact;
  }

  return `${compact.slice(0, 180)}...`;
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
