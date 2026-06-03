'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type EventStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

type EventSummary = {
  id: string;
  title: string;
  status: EventStatus;
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

type GenerateRecommendationsResponse = {
  generatedCount: number;
  skippedCount: number;
  generated: Recommendation[];
  recommendations: Recommendation[];
};

type FilterStatus = 'ALL' | RecommendationStatus;

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

const filterOptions: FilterStatus[] = ['ALL', 'OPEN', 'RESOLVED'];

export default function EventRecommendationsPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');

  const canManageRecommendations =
    user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const eventQuery = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiRequest<EventSummary>(`/events/${eventId}`),
    enabled: Boolean(eventId),
  });

  const recommendationsQuery = useQuery({
    queryKey: ['events', eventId, 'recommendations'],
    queryFn: () =>
      apiRequest<Recommendation[]>(`/events/${eventId}/recommendations`),
    enabled: Boolean(eventId),
  });

  const recommendations = useMemo(
    () => recommendationsQuery.data ?? [],
    [recommendationsQuery.data],
  );
  const summary = useMemo(() => buildSummary(recommendations), [recommendations]);
  const visibleRecommendations = recommendations.filter((recommendation) => {
    return (
      filterStatus === 'ALL' || recommendation.status === filterStatus
    );
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiRequest<GenerateRecommendationsResponse>(
        `/events/${eventId}/recommendations/generate`,
        {
          method: 'POST',
        },
      ),
    onSuccess: async (response) => {
      await invalidateRecommendationQueries(queryClient, eventId);

      if (response.generatedCount > 0) {
        toast.success(
          `${response.generatedCount} recommendation${
            response.generatedCount === 1 ? '' : 's'
          } generated`,
        );
        return;
      }

      toast.info('No new recommendations generated');
    },
    onError: () => {
      toast.error('Recommendations could not be generated');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (recommendationId: string) =>
      apiRequest<Recommendation>(`/recommendations/${recommendationId}/resolve`, {
        method: 'PATCH',
      }),
    onSuccess: async () => {
      await invalidateRecommendationQueries(queryClient, eventId);
      toast.success('Recommendation resolved');
    },
    onError: () => {
      toast.error('Recommendation could not be resolved');
    },
  });

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
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              AI-assisted operations
            </div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Recommendations
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {eventQuery.data?.title ??
                'Review readiness, engagement and audience growth risks.'}
            </p>
          </div>

          {canManageRecommendations ? (
            <button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              <RefreshCw
                className={`h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Generate recommendations
            </button>
          ) : (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
              Read-only access
            </div>
          )}
        </div>
      </section>

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
          icon={Lightbulb}
          label="Generated"
          value={recommendations.length}
          detail="Total insights"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Resolved"
          value={summary.resolved}
          detail="Closed actions"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Operational recommendations
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Rule-based insights that simulate AI-assisted event operations.
            </p>
          </div>

          <div className="inline-flex rounded-md bg-slate-100 p-1">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilterStatus(option)}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                  filterStatus === option
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {formatEnum(option)}
              </button>
            ))}
          </div>
        </div>

        {recommendationsQuery.isLoading ? (
          <RecommendationSkeleton />
        ) : recommendationsQuery.isError ? (
          <div className="p-5 text-sm text-red-600">
            Recommendations could not be loaded.
          </div>
        ) : recommendations.length === 0 ? (
          <EmptyRecommendations
            canGenerate={canManageRecommendations}
            isGenerating={generateMutation.isPending}
            onGenerate={() => generateMutation.mutate()}
          />
        ) : visibleRecommendations.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-sm font-medium text-slate-900">
              No recommendations match this filter
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Switch filters to review the rest of the operational history.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                canResolve={canManageRecommendations}
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

function RecommendationCard({
  recommendation,
  canResolve,
  isResolving,
  onResolve,
}: {
  recommendation: Recommendation;
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
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
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
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {recommendation.description}
          </p>
          <div className="mt-4 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Suggested action
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {recommendation.suggestedAction}
            </p>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Created {formatDate(recommendation.createdAt)}
            {recommendation.resolvedAt
              ? ` / Resolved ${formatDate(recommendation.resolvedAt)}`
              : ''}
          </div>
        </div>

        {canResolve && recommendation.status === 'OPEN' ? (
          <button
            type="button"
            onClick={onResolve}
            disabled={isResolving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Mark resolved
          </button>
        ) : null}
      </div>
    </article>
  );
}

function EmptyRecommendations({
  canGenerate,
  isGenerating,
  onGenerate,
}: {
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="mt-4 text-sm font-medium text-slate-900">
        No recommendations yet
      </div>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Generate rule-based insights to check readiness, audience growth,
        content quality and engagement risks.
      </p>
      {canGenerate ? (
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          <RefreshCw
            className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Generate recommendations
        </button>
      ) : null}
    </div>
  );
}

function RecommendationSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

function buildSummary(recommendations: Recommendation[]) {
  return recommendations.reduce(
    (summary, recommendation) => {
      if (recommendation.status === 'OPEN') {
        summary.open += 1;
      }

      if (recommendation.status === 'RESOLVED') {
        summary.resolved += 1;
      }

      if (
        recommendation.status === 'OPEN' &&
        recommendation.severity === 'HIGH'
      ) {
        summary.high += 1;
      }

      return summary;
    },
    {
      open: 0,
      high: 0,
      resolved: 0,
    },
  );
}

async function invalidateRecommendationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['events', eventId, 'recommendations'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['events', eventId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['events', eventId, 'audit-logs'],
    }),
  ]);
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
