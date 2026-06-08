'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  FileVideo,
  Library,
  LinkIcon,
  Plus,
  Scissors,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type MediaAssetType = 'VIDEO' | 'REPLAY' | 'SLIDES' | 'IMAGE' | 'RESOURCE';
type MediaAssetStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'ARCHIVED';

type EventSummary = {
  id: string;
  title: string;
  status: string;
  startTime: string;
};

type MediaAsset = {
  id: string;
  title: string;
  description: string | null;
  assetType: MediaAssetType;
  source: string;
  status: MediaAssetStatus;
  durationSeconds: number | null;
  sizeBytes: number | null;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
  createdAt: string;
  event: {
    id: string;
    title: string;
    status: string;
    startTime: string;
  } | null;
  markers: Array<{
    id: string;
    timestampSeconds: number;
    label: string;
    note: string | null;
  }>;
};

type MediaAssetListResponse = {
  items: MediaAsset[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const statusStyles: Record<MediaAssetStatus, string> = {
  PROCESSING: 'bg-amber-50 text-amber-700 ring-amber-100',
  READY: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  FAILED: 'bg-red-50 text-red-700 ring-red-100',
  ARCHIVED: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export default function EventMediaPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [clipRequestAsset, setClipRequestAsset] = useState<MediaAsset | null>(
    null,
  );

  const canManageMedia =
    user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const eventQuery = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiRequest<EventSummary>(`/events/${eventId}`),
    enabled: Boolean(eventId),
  });

  const eventMediaQuery = useQuery({
    queryKey: ['events', eventId, 'media-assets'],
    queryFn: () => apiRequest<MediaAsset[]>(`/events/${eventId}/media-assets`),
    enabled: Boolean(eventId),
  });

  const libraryQuery = useQuery({
    queryKey: ['media-assets', { status: 'READY', pageSize: 50 }],
    queryFn: () =>
      apiRequest<MediaAssetListResponse>(
        '/media-assets?status=READY&pageSize=50',
      ),
    enabled: canManageMedia,
  });

  const attachedAssets = useMemo(
    () => eventMediaQuery.data ?? [],
    [eventMediaQuery.data],
  );
  const libraryAssets = useMemo(
    () => libraryQuery.data?.items ?? [],
    [libraryQuery.data?.items],
  );
  const attachableAssets = useMemo(() => {
    const attachedIds = new Set(attachedAssets.map((asset) => asset.id));

    return libraryAssets.filter((asset) => !attachedIds.has(asset.id));
  }, [attachedAssets, libraryAssets]);

  const summary = useMemo(() => buildSummary(attachedAssets), [attachedAssets]);

  const attachMutation = useMutation({
    mutationFn: (assetId: string) =>
      apiRequest<MediaAsset>(
        `/events/${eventId}/media-assets/${assetId}/attach`,
        {
          method: 'POST',
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['events', eventId, 'media-assets'],
        }),
        queryClient.invalidateQueries({ queryKey: ['media-assets'] }),
        queryClient.invalidateQueries({
          queryKey: ['events', eventId, 'audit-logs'],
        }),
      ]);
      setSelectedAssetId('');
      toast.success('Media asset attached');
    },
    onError: () => {
      toast.error('Media asset could not be attached');
    },
  });

  const handleAttachAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedAssetId) {
      toast.error('Select a media asset to attach');
      return;
    }

    await attachMutation.mutateAsync(selectedAssetId);
  };

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
            <div className="mb-3 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              Replay operations
            </div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Media & replay
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {eventQuery.data?.title ?? 'Manage event replay and media assets.'}
            </p>
          </div>
          <Link
            href="/media-library"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <Library className="h-4 w-4" />
            Media library
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Library}
          label="Attached assets"
          value={summary.total}
          detail="For this event"
        />
        <SummaryCard
          icon={FileVideo}
          label="Replays"
          value={summary.replays}
          detail="Replay packages"
        />
        <SummaryCard
          icon={Clock}
          label="Duration"
          value={formatDuration(summary.durationSeconds)}
          detail="Total media runtime"
        />
        <SummaryCard
          icon={Scissors}
          label="Markers"
          value={summary.markers}
          detail="Clip candidates"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">
              Event media assets
            </h2>
            <Video className="h-5 w-5 text-emerald-600" />
          </div>

          {eventMediaQuery.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-md bg-slate-100"
                />
              ))}
            </div>
          ) : eventMediaQuery.isError ? (
            <div className="p-5 text-sm text-red-600">
              Event media could not be loaded.
            </div>
          ) : attachedAssets.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="text-sm font-medium text-slate-900">
                No media attached
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Attach a replay, recording or resource from the media library.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attachedAssets.map((asset) => (
                <article key={asset.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div
                      className="h-36 w-full shrink-0 rounded-lg bg-slate-100 bg-cover bg-center ring-1 ring-slate-200 lg:w-52"
                      style={{
                        backgroundImage: asset.thumbnailUrl
                          ? `url(${asset.thumbnailUrl})`
                          : undefined,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={asset.status} />
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          {formatEnum(asset.assetType)}
                        </span>
                        {asset.durationSeconds ? (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {formatDuration(asset.durationSeconds)}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-base font-semibold text-slate-950">
                        {asset.title}
                      </h3>
                      {asset.description ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {asset.description}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {asset.playbackUrl ? (
                          <a
                            href={asset.playbackUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <LinkIcon className="h-4 w-4" />
                            Open asset
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setClipRequestAsset(asset)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Scissors className="h-4 w-4" />
                          Request clip
                        </button>
                      </div>

                      {asset.markers.length > 0 ? (
                        <div className="mt-5 rounded-lg border border-slate-200">
                          <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Markers
                          </div>
                          <div className="divide-y divide-slate-100">
                            {asset.markers.map((marker) => (
                              <div
                                key={marker.id}
                                className="grid gap-2 px-3 py-3 sm:grid-cols-[90px_1fr]"
                              >
                                <div className="text-sm font-medium text-slate-700">
                                  {formatTimestamp(marker.timestampSeconds)}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">
                                    {marker.label}
                                  </div>
                                  {marker.note ? (
                                    <div className="mt-1 text-xs text-slate-500">
                                      {marker.note}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Attach asset
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Link a ready asset to this event.
                </p>
              </div>
              <Plus className="h-5 w-5 text-emerald-600" />
            </div>
            {canManageMedia ? (
              <form className="space-y-4 p-5" onSubmit={handleAttachAsset}>
                <label>
                  <span className="text-sm font-medium text-slate-700">
                    Ready media asset
                  </span>
                  <select
                    value={selectedAssetId}
                    onChange={(event) => setSelectedAssetId(event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Select asset</option>
                    {attachableAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={attachMutation.isPending}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  <Plus className="h-4 w-4" />
                  {attachMutation.isPending ? 'Attaching...' : 'Attach asset'}
                </button>
              </form>
            ) : (
              <div className="p-5 text-sm text-slate-500">
                Your current role can view event media but cannot attach assets.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">
              Replay readiness
            </h2>
            <div className="mt-4 space-y-3">
              <ReadinessLine
                label="Replay asset attached"
                completed={summary.replays > 0}
              />
              <ReadinessLine
                label="Playback URL available"
                completed={attachedAssets.some((asset) => asset.playbackUrl)}
              />
              <ReadinessLine
                label="Markers prepared"
                completed={summary.markers > 0}
              />
            </div>
          </section>
        </aside>
      </section>

      {clipRequestAsset ? (
        <ClipRequestDialog
          asset={clipRequestAsset}
          onClose={() => setClipRequestAsset(null)}
        />
      ) : null}
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
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <Icon className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="mt-3 truncate text-3xl font-semibold text-slate-950">
        {value}
      </div>
      <div className="mt-1 truncate text-sm text-slate-500">{detail}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: MediaAssetStatus }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusStyles[status]}`}
    >
      {formatEnum(status)}
    </span>
  );
}

function ReadinessLine({
  label,
  completed,
}: {
  label: string;
  completed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span
        className={`rounded-md px-2 py-1 text-xs font-semibold ${
          completed
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
        }`}
      >
        {completed ? 'Ready' : 'Open'}
      </span>
    </div>
  );
}

function ClipRequestDialog({
  asset,
  onClose,
}: {
  asset: MediaAsset;
  onClose: () => void;
}) {
  const firstMarker = asset.markers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clip-request-title"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h2
            id="clip-request-title"
            className="text-base font-semibold text-slate-950"
          >
            Clip request
          </h2>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-slate-950">
              {asset.title}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {firstMarker
                ? `${formatTimestamp(firstMarker.timestampSeconds)} / ${firstMarker.label}`
                : 'No marker selected'}
            </div>
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
            The production team can use this marker as the starting point for a short highlight clip.
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function buildSummary(assets: MediaAsset[]) {
  return {
    total: assets.length,
    replays: assets.filter((asset) => asset.assetType === 'REPLAY').length,
    durationSeconds: assets.reduce(
      (total, asset) => total + (asset.durationSeconds ?? 0),
      0,
    ),
    markers: assets.reduce((total, asset) => total + asset.markers.length, 0),
  };
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDuration(value: number) {
  const minutes = Math.floor(value / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${minutes}m`;
}

function formatTimestamp(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
