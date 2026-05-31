'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CalendarPlus,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
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

type EventListItem = {
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
  accessRules: unknown[];
  contentModules: unknown[];
  recommendations: Array<{
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'OPEN' | 'RESOLVED';
  }>;
  _count: {
    registrations: number;
  };
};

const statusOptions: Array<'ALL' | EventStatus> = [
  'ALL',
  'DRAFT',
  'SCHEDULED',
  'LIVE',
  'COMPLETED',
  'CANCELLED',
];

const statusStyles: Record<EventStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-100',
  LIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  COMPLETED: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-100',
};

const typeLabels: Record<EventType, string> = {
  WEBINAR: 'Webinar',
  PRODUCT_LAUNCH: 'Product Launch',
  TRAINING: 'Training',
  INTERNAL_LIVESTREAM: 'Internal Livestream',
  TOWN_HALL: 'Town Hall',
  CUSTOMER_ONBOARDING: 'Customer Onboarding',
};

export default function EventsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | EventStatus>('ALL');
  const canCreateEvent = user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const {
    data: events = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['events'],
    queryFn: () => apiRequest<EventListItem[]>('/events'),
  });

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesStatus = status === 'ALL' || event.status === status;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        event.title.toLowerCase().includes(normalizedSearch) ||
        typeLabels[event.eventType].toLowerCase().includes(normalizedSearch) ||
        event.createdBy.name.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [events, search, status]);

  const summary = useMemo(
    () => ({
      total: events.length,
      scheduled: events.filter((event) => event.status === 'SCHEDULED').length,
      live: events.filter((event) => event.status === 'LIVE').length,
      recommendations: events.reduce(
        (total, event) => total + event.recommendations.length,
        0,
      ),
    }),
    [events],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Events</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage operational setup, access readiness and event ownership.
          </p>
        </div>
        {canCreateEvent ? (
          <Link
            href="/events/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            New event
          </Link>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Total events" value={summary.total} />
        <SummaryTile label="Scheduled" value={summary.scheduled} />
        <SummaryTile label="Live" value={summary.live} />
        <SummaryTile label="Open recommendations" value={summary.recommendations} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events, owners or types"
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as 'ALL' | EventStatus)
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnum(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <EventsTableSkeleton />
        ) : isError ? (
          <div className="p-6">
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Events could not be loaded.
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="text-sm font-medium text-slate-900">
              No events found
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Try a different search or status filter.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Event</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Owner</th>
                  <th className="px-5 py-3 font-semibold">Start time</th>
                  <th className="px-5 py-3 font-semibold">Setup</th>
                  <th className="px-5 py-3 font-semibold">Registrations</th>
                  <th className="px-5 py-3 font-semibold" aria-label="Open" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-950">
                        {event.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span>{typeLabels[event.eventType]}</span>
                        {event.description ? (
                          <>
                            <span className="text-slate-300">/</span>
                            <span className="max-w-[340px] truncate">
                              {event.description}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {event.createdBy.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {event.createdBy.email}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDate(event.startTime)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <SetupPill
                          label="Access"
                          active={event.accessRules.length > 0}
                        />
                        <SetupPill
                          label="Content"
                          active={event.contentModules.length > 0}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {event._count.registrations}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Target {event.registrationTarget}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-emerald-700 hover:ring-1 hover:ring-slate-200"
                        aria-label={`Open ${event.title}`}
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
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

function SetupPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ${
        active
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
          : 'bg-amber-50 text-amber-700 ring-amber-100'
      }`}
    >
      {label}
    </span>
  );
}

function EventsTableSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-6 gap-4 px-5 py-4">
          <div className="col-span-2 h-10 animate-pulse rounded-md bg-slate-100" />
          <div className="h-10 animate-pulse rounded-md bg-slate-100" />
          <div className="h-10 animate-pulse rounded-md bg-slate-100" />
          <div className="h-10 animate-pulse rounded-md bg-slate-100" />
          <div className="h-10 animate-pulse rounded-md bg-slate-100" />
        </div>
      ))}
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
