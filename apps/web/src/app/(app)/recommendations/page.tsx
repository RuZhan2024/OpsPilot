'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Filter,
  Lightbulb,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type EventStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

type EventListItem = {
  id: string;
  title: string;
  status: EventStatus;
  startTime: string;
};

type RecommendationType =
  | 'READINESS_RISK'
  | 'ENGAGEMENT_RISK'
  | 'AUDIENCE_GROWTH'
  | 'CONTENT_QUALITY'
  | 'POST_EVENT_IMPROVEMENT';

type RecommendationSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
type RecommendationStatus = 'OPEN' | 'RESOLVED';

type Recommendation = {
  id: string;
  eventId: string;
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  suggestedAction: string;
  status: RecommendationStatus;
  createdAt: string;
  resolvedAt: string | null;
};

type RecommendationWithEvent = Recommendation & {
  event: EventListItem;
};

type RecommendationsOverview = {
  events: EventListItem[];
  recommendations: RecommendationWithEvent[];
};

type FilterValue = 'ALL';
type StatusFilter = FilterValue | RecommendationStatus;
type SeverityFilter = FilterValue | RecommendationSeverity;
type TypeFilter = FilterValue | RecommendationType;

const allFilter = 'ALL';

const statusOptions: StatusFilter[] = ['ALL', 'OPEN', 'RESOLVED'];
const severityOptions: SeverityFilter[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
const typeOptions: TypeFilter[] = [
  'ALL',
  'READINESS_RISK',
  'ENGAGEMENT_RISK',
  'AUDIENCE_GROWTH',
  'CONTENT_QUALITY',
  'POST_EVENT_IMPROVEMENT',
];

const severityStyles: Record<RecommendationSeverity, string> = {
  HIGH: 'bg-red-50 text-red-700 ring-red-100',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-100',
  LOW: 'bg-blue-50 text-blue-700 ring-blue-100',
};

const statusStyles: Record<RecommendationStatus, string> = {
  OPEN: 'bg-slate-100 text-slate-700 ring-slate-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

const typeLabels: Record<RecommendationType, string> = {
  READINESS_RISK: 'Readiness Risk',
  ENGAGEMENT_RISK: 'Engagement Risk',
  AUDIENCE_GROWTH: 'Audience Growth',
  CONTENT_QUALITY: 'Content Quality',
  POST_EVENT_IMPROVEMENT: 'Post-event Improvement',
};

export default function RecommendationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const canResolveRecommendations =
    user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const overviewQuery = useQuery({
    queryKey: ['recommendations-overview'],
    queryFn: getRecommendationsOverview,
  });

  const recommendations = useMemo(
    () => overviewQuery.data?.recommendations ?? [],
    [overviewQuery.data],
  );
  const summary = useMemo(
    () => buildSummary(recommendations, overviewQuery.data?.events ?? []),
    [overviewQuery.data?.events, recommendations],
  );

  const visibleRecommendations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return recommendations.filter((recommendation) => {
      const matchesStatus =
        statusFilter === allFilter || recommendation.status === statusFilter;
      const matchesSeverity =
        severityFilter === allFilter ||
        recommendation.severity === severityFilter;
      const matchesType =
        typeFilter === allFilter || recommendation.type === typeFilter;

      if (!matchesStatus || !matchesSeverity || !matchesType) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        recommendation.title,
        recommendation.description,
        recommendation.suggestedAction,
        recommendation.event.title,
        typeLabels[recommendation.type],
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [recommendations, searchTerm, severityFilter, statusFilter, typeFilter]);

  const resolveMutation = useMutation({
    mutationFn: (recommendationId: string) =>
      apiRequest<Recommendation>(`/recommendations/${recommendationId}/resolve`, {
        method: 'PATCH',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['recommendations-overview'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard-summary'],
        }),
      ]);
      toast.success('Recommendation resolved');
    },
    onError: () => {
      toast.error('Recommendation could not be resolved');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI-assisted recommendations
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Recommendations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track readiness, audience growth, engagement and post-event risks
            across the workspace.
          </p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          Rule-based public demo
        </div>
      </div>

      {overviewQuery.isLoading ? (
        <RecommendationsSkeleton />
      ) : overviewQuery.isError || !overviewQuery.data ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Recommendations could not be loaded.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={CircleAlert}
              label="Open items"
              value={summary.open}
              detail="Unresolved recommendations"
            />
            <SummaryCard
              icon={AlertTriangle}
              label="High severity"
              value={summary.high}
              detail="Needs attention first"
            />
            <SummaryCard
              icon={Target}
              label="Events with risk"
              value={summary.eventsWithOpenRisk}
              detail={`${summary.totalEvents} visible events`}
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Resolved"
              value={summary.resolved}
              detail="Closed operational actions"
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Operational risk queue
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Prioritise high severity open items, then drill into the
                  event-level recommendation workspace.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_160px_220px] xl:w-[820px]">
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Search recommendations"
                  />
                </label>

                <FilterSelect
                  label="Status"
                  value={statusFilter}
                  options={statusOptions}
                  onChange={(value) => setStatusFilter(value as StatusFilter)}
                />
                <FilterSelect
                  label="Severity"
                  value={severityFilter}
                  options={severityOptions}
                  onChange={(value) =>
                    setSeverityFilter(value as SeverityFilter)
                  }
                />
                <FilterSelect
                  label="Type"
                  value={typeFilter}
                  options={typeOptions}
                  onChange={(value) => setTypeFilter(value as TypeFilter)}
                />
              </div>
            </div>

            {recommendations.length === 0 ? (
              <EmptyState />
            ) : visibleRecommendations.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-sm font-medium text-slate-900">
                  No recommendations match your filters
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Try another status, severity, type or search term.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleRecommendations.map((recommendation) => (
                  <RecommendationRow
                    key={recommendation.id}
                    recommendation={recommendation}
                    canResolve={canResolveRecommendations}
                    isResolving={
                      resolveMutation.isPending &&
                      resolveMutation.variables === recommendation.id
                    }
                    onResolve={() => resolveMutation.mutate(recommendation.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

async function getRecommendationsOverview(): Promise<RecommendationsOverview> {
  const events = await apiRequest<EventListItem[]>('/events');
  const recommendationGroups = await Promise.all(
    events.map(async (event) => {
      const recommendations = await apiRequest<Recommendation[]>(
        `/events/${event.id}/recommendations`,
      );

      return recommendations.map((recommendation) => ({
        ...recommendation,
        event,
      }));
    }),
  );

  return {
    events,
    recommendations: recommendationGroups
      .flat()
      .sort(sortRecommendations),
  };
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

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block">
      <Filter
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === allFilter ? `All ${label.toLowerCase()}` : formatEnum(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function RecommendationRow({
  recommendation,
  canResolve,
  isResolving,
  onResolve,
}: {
  recommendation: RecommendationWithEvent;
  canResolve: boolean;
  isResolving: boolean;
  onResolve: () => void;
}) {
  const Icon =
    recommendation.severity === 'HIGH'
      ? AlertTriangle
      : recommendation.status === 'RESOLVED'
        ? CheckCircle2
        : Lightbulb;

  return (
    <article className="p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Icon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${severityStyles[recommendation.severity]}`}
            >
              {formatEnum(recommendation.severity)}
            </span>
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusStyles[recommendation.status]}`}
            >
              {formatEnum(recommendation.status)}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {typeLabels[recommendation.type]}
            </span>
          </div>

          <h3 className="text-base font-semibold text-slate-950">
            {recommendation.title}
          </h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            {recommendation.description}
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Event
              </div>
              <div className="mt-2 text-sm font-medium text-slate-900">
                {recommendation.event.title}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {formatEnum(recommendation.event.status)} /{' '}
                {formatDate(recommendation.event.startTime)}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Suggested action
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {recommendation.suggestedAction}
              </p>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Created {formatDate(recommendation.createdAt)}
            {recommendation.resolvedAt
              ? ` / Resolved ${formatDate(recommendation.resolvedAt)}`
              : ''}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
          <Link
            href={`/events/${recommendation.eventId}/recommendations`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open event
          </Link>
          {canResolve && recommendation.status === 'OPEN' ? (
            <button
              type="button"
              onClick={onResolve}
              disabled={isResolving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Mark resolved
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="mt-4 text-sm font-medium text-slate-900">
        No recommendations yet
      </div>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Generate recommendations from individual event pages to populate this
        workspace risk queue.
      </p>
    </div>
  );
}

function RecommendationsSkeleton() {
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
        <div className="h-24 border-b border-slate-200" />
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

function buildSummary(
  recommendations: RecommendationWithEvent[],
  events: EventListItem[],
) {
  const eventsWithOpenRisk = new Set(
    recommendations
      .filter((recommendation) => recommendation.status === 'OPEN')
      .map((recommendation) => recommendation.eventId),
  );

  return recommendations.reduce(
    (summary, recommendation) => {
      if (recommendation.status === 'OPEN') {
        summary.open += 1;
      }

      if (
        recommendation.status === 'OPEN' &&
        recommendation.severity === 'HIGH'
      ) {
        summary.high += 1;
      }

      if (recommendation.status === 'RESOLVED') {
        summary.resolved += 1;
      }

      return summary;
    },
    {
      open: 0,
      high: 0,
      resolved: 0,
      eventsWithOpenRisk: eventsWithOpenRisk.size,
      totalEvents: events.length,
    },
  );
}

function sortRecommendations(
  first: RecommendationWithEvent,
  second: RecommendationWithEvent,
) {
  const statusDifference =
    statusRank[first.status] - statusRank[second.status];

  if (statusDifference !== 0) {
    return statusDifference;
  }

  const severityDifference =
    severityRank[first.severity] - severityRank[second.severity];

  if (severityDifference !== 0) {
    return severityDifference;
  }

  return (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
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

const statusRank: Record<RecommendationStatus, number> = {
  OPEN: 0,
  RESOLVED: 1,
};

const severityRank: Record<RecommendationSeverity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};
