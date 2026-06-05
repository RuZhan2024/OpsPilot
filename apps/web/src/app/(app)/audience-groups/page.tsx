'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CircleAlert,
  MailCheck,
  Save,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type EventStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

type AudienceGroup = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type EventListItem = {
  id: string;
  title: string;
  status: EventStatus;
  startTime: string;
  registrationTarget: number;
  accessRules: Array<{
    id: string;
    type: string;
    domainWhitelist: string[];
    requiresApproval: boolean;
  }>;
  _count: {
    registrations: number;
  };
};

type AudienceGroupFormState = {
  name: string;
  description: string;
};

const defaultFormState: AudienceGroupFormState = {
  name: '',
  description: '',
};

const statusStyles: Record<EventStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-100',
  LIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  COMPLETED: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-100',
};

export default function AudienceGroupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [formState, setFormState] =
    useState<AudienceGroupFormState>(defaultFormState);

  const canCreateAudienceGroup =
    user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const audienceGroupsQuery = useQuery({
    queryKey: ['audience-groups'],
    queryFn: () => apiRequest<AudienceGroup[]>('/audience-groups'),
  });

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => apiRequest<EventListItem[]>('/events'),
  });

  const audienceGroups = useMemo(
    () => audienceGroupsQuery.data ?? [],
    [audienceGroupsQuery.data],
  );
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  const filteredGroups = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return audienceGroups;
    }

    return audienceGroups.filter((group) => {
      return [group.name, group.description ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    });
  }, [audienceGroups, searchTerm]);

  const accessSummary = useMemo(() => buildAccessSummary(events), [events]);

  const createMutation = useMutation({
    mutationFn: () => {
      const description = formState.description.trim();

      return apiRequest<AudienceGroup>('/audience-groups', {
        method: 'POST',
        body: JSON.stringify({
          name: formState.name.trim(),
          description: description || undefined,
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['audience-groups'] });
      setFormState(defaultFormState);
      toast.success('Audience group created');
    },
    onError: () => {
      toast.error('Audience group could not be created');
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formState.name.trim().length < 2) {
      toast.error('Audience group name must be at least 2 characters');
      return;
    }

    await createMutation.mutateAsync();
  };

  const isLoading = audienceGroupsQuery.isLoading || eventsQuery.isLoading;
  const isError = audienceGroupsQuery.isError || eventsQuery.isError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Audience Groups
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage workspace audience segments and monitor event access setup.
          </p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          {audienceGroups.length} group{audienceGroups.length === 1 ? '' : 's'}
        </div>
      </div>

      {isLoading ? (
        <AudienceGroupsSkeleton />
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Audience data could not be loaded.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Users}
              label="Audience groups"
              value={audienceGroups.length}
              detail="Workspace segments"
            />
            <SummaryCard
              icon={ShieldCheck}
              label="Events with rules"
              value={accessSummary.configuredEvents}
              detail={`${events.length} visible events`}
            />
            <SummaryCard
              icon={CircleAlert}
              label="Missing access"
              value={accessSummary.missingAccessEvents.length}
              detail="Needs setup"
            />
            <SummaryCard
              icon={MailCheck}
              label="Domain restricted"
              value={accessSummary.domainRestrictedEvents}
              detail="B2B access workflows"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Create audience group
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Segment audiences for campaign planning and future access
                    automation.
                  </p>
                </div>
                <Users className="h-5 w-5 text-emerald-600" />
              </div>

              {canCreateAudienceGroup ? (
                <form className="space-y-5 p-5" onSubmit={handleSubmit}>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Group name
                    </label>
                    <input
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className={inputClassName}
                      placeholder="Enterprise customers"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <textarea
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className={`${inputClassName} min-h-28 py-3`}
                      placeholder="Accounts invited to product launches and security briefings."
                    />
                  </div>

                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                    Audience groups are stored at workspace level. Event-level
                    access rules still control registration and replay access in
                    this MVP.
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Create group
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-5 text-sm text-slate-500">
                  Your current role can view audience groups but cannot create
                  them.
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Workspace audience groups
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Shared segments available to event operations.
                  </p>
                </div>

                <label className="relative block md:w-72">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Search groups"
                  />
                </label>
              </div>

              {audienceGroups.length === 0 ? (
                <EmptyGroups />
              ) : filteredGroups.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="text-sm font-medium text-slate-900">
                    No audience groups match your search
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Try another group name or description.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredGroups.map((group) => (
                    <article key={group.id} className="p-5">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-950">
                            {group.name}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {group.description ||
                              'No description has been added yet.'}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          Created {formatDate(group.createdAt)}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Event access coverage
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Events without access rules reduce readiness and create
                  registration ambiguity.
                </p>
              </div>
              <CalendarDays className="h-5 w-5 text-emerald-600" />
            </div>

            {events.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                No events are visible to this role.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Event</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Access setup</th>
                      <th className="px-5 py-3 font-semibold">
                        Registrations
                      </th>
                      <th className="px-5 py-3 font-semibold" aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((event) => {
                      const firstRule = event.accessRules[0];

                      return (
                        <tr key={event.id} className="transition hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-950">
                              {event.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Starts {formatDate(event.startTime)}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusStyles[event.status]}`}
                            >
                              {formatEnum(event.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {firstRule ? (
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {formatEnum(firstRule.type)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {firstRule.domainWhitelist.length > 0
                                    ? firstRule.domainWhitelist
                                        .map((domain) => `@${domain}`)
                                        .join(', ')
                                    : firstRule.requiresApproval
                                      ? 'Approval required'
                                      : 'Configured'}
                                </div>
                              </div>
                            ) : (
                              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                                Missing rule
                              </span>
                            )}
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
                              href={`/events/${event.id}/audience`}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Configure
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
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

function EmptyGroups() {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        <Users className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="mt-4 text-sm font-medium text-slate-900">
        No audience groups yet
      </div>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Create workspace audience groups to make campaign and access planning
        easier to understand in the demo.
      </p>
    </div>
  );
}

function AudienceGroupsSkeleton() {
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
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}

function buildAccessSummary(events: EventListItem[]) {
  const missingAccessEvents = events.filter(
    (event) => event.accessRules.length === 0,
  );
  const domainRestrictedEvents = events.filter((event) =>
    event.accessRules.some(
      (rule) => rule.type === 'EMAIL_DOMAIN_RESTRICTED',
    ),
  ).length;

  return {
    configuredEvents: events.length - missingAccessEvents.length,
    missingAccessEvents,
    domainRestrictedEvents,
  };
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

const inputClassName =
  'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';
