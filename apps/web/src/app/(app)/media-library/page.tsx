'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Database,
  FileVideo,
  Filter,
  Library,
  LinkIcon,
  Save,
  Search,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type MediaAssetType = 'VIDEO' | 'REPLAY' | 'SLIDES' | 'IMAGE' | 'RESOURCE';
type MediaAssetSource =
  | 'UPLOADED'
  | 'LIVE_RECORDING'
  | 'REPLAY_EXPORT'
  | 'EXTERNAL_LINK';
type MediaAssetStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'ARCHIVED';

type MediaAsset = {
  id: string;
  title: string;
  description: string | null;
  assetType: MediaAssetType;
  source: MediaAssetSource;
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
  createdBy: {
    id: string;
    name: string;
    email: string;
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

type MediaAssetFormState = {
  title: string;
  description: string;
  assetType: MediaAssetType;
  source: MediaAssetSource;
  status: MediaAssetStatus;
  playbackUrl: string;
};

const assetTypes: Array<'ALL' | MediaAssetType> = [
  'ALL',
  'VIDEO',
  'REPLAY',
  'SLIDES',
  'IMAGE',
  'RESOURCE',
];
const sources: Array<'ALL' | MediaAssetSource> = [
  'ALL',
  'UPLOADED',
  'LIVE_RECORDING',
  'REPLAY_EXPORT',
  'EXTERNAL_LINK',
];
const statuses: Array<'ALL' | MediaAssetStatus> = [
  'ALL',
  'PROCESSING',
  'READY',
  'FAILED',
  'ARCHIVED',
];

const defaultFormState: MediaAssetFormState = {
  title: '',
  description: '',
  assetType: 'VIDEO',
  source: 'UPLOADED',
  status: 'PROCESSING',
  playbackUrl: 'https://example.com/media/new-asset',
};

const statusStyles: Record<MediaAssetStatus, string> = {
  PROCESSING: 'bg-amber-50 text-amber-700 ring-amber-100',
  READY: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  FAILED: 'bg-red-50 text-red-700 ring-red-100',
  ARCHIVED: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export default function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [assetType, setAssetType] = useState<'ALL' | MediaAssetType>('ALL');
  const [source, setSource] = useState<'ALL' | MediaAssetSource>('ALL');
  const [status, setStatus] = useState<'ALL' | MediaAssetStatus>('ALL');
  const [page, setPage] = useState(1);
  const [formState, setFormState] =
    useState<MediaAssetFormState>(defaultFormState);

  const canManageMedia =
    user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const mediaQuery = useQuery({
    queryKey: ['media-assets', { search, assetType, source, status, page }],
    queryFn: () =>
      apiRequest<MediaAssetListResponse>(
        `/media-assets?${buildMediaQuery({
          search,
          assetType,
          source,
          status,
          page,
        })}`,
      ),
  });

  const assets = useMemo(
    () => mediaQuery.data?.items ?? [],
    [mediaQuery.data?.items],
  );
  const meta = mediaQuery.data?.meta;
  const summary = useMemo(
    () => buildSummary(assets, meta?.total ?? 0),
    [assets, meta],
  );

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest<MediaAsset>('/media-assets', {
        method: 'POST',
        body: JSON.stringify({
          title: formState.title.trim(),
          description: formState.description.trim() || undefined,
          assetType: formState.assetType,
          source: formState.source,
          status: formState.status,
          playbackUrl: formState.playbackUrl.trim() || undefined,
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      setFormState(defaultFormState);
      toast.success('Media asset created');
    },
    onError: () => {
      toast.error('Media asset could not be created');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (assetId: string) =>
      apiRequest<MediaAsset>(`/media-assets/${assetId}/archive`, {
        method: 'PATCH',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      toast.success('Media asset archived');
    },
    onError: () => {
      toast.error('Media asset could not be archived');
    },
  });

  const handleCreateAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formState.title.trim().length < 3) {
      toast.error('Media asset title must be at least 3 characters');
      return;
    }

    await createMutation.mutateAsync();
  };

  const handleFilterChange = (callback: () => void) => {
    callback();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Media library
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage replay assets, live recordings, slide decks and event resources.
          </p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          {summary.total} assets
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Library}
          label="Total assets"
          value={summary.total}
          detail="Workspace media"
        />
        <SummaryCard
          icon={Video}
          label="Ready"
          value={summary.ready}
          detail="Available for replay"
        />
        <SummaryCard
          icon={FileVideo}
          label="Replay assets"
          value={summary.replays}
          detail="Linked or attachable"
        />
        <SummaryCard
          icon={Database}
          label="Processing"
          value={summary.processing}
          detail="Awaiting review"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
              <label className="relative">
                <span className="sr-only">Search media assets</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) =>
                    handleFilterChange(() => setSearch(event.target.value))
                  }
                  placeholder="Search title, description or event"
                  className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <FilterSelect
                label="Asset type"
                value={assetType}
                options={assetTypes}
                onChange={(value) =>
                  handleFilterChange(() =>
                    setAssetType(value as 'ALL' | MediaAssetType),
                  )
                }
              />
              <FilterSelect
                label="Source"
                value={source}
                options={sources}
                onChange={(value) =>
                  handleFilterChange(() =>
                    setSource(value as 'ALL' | MediaAssetSource),
                  )
                }
              />
              <FilterSelect
                label="Status"
                value={status}
                options={statuses}
                onChange={(value) =>
                  handleFilterChange(() =>
                    setStatus(value as 'ALL' | MediaAssetStatus),
                  )
                }
              />
            </div>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-950">
                Assets
              </h2>
              <Filter className="h-5 w-5 text-emerald-600" />
            </div>

            {mediaQuery.isLoading ? (
              <MediaTableSkeleton />
            ) : mediaQuery.isError ? (
              <div className="p-5 text-sm text-red-600">
                Media assets could not be loaded.
              </div>
            ) : assets.length === 0 ? (
              <div className="px-5 py-10 text-center">
              <div className="text-sm font-medium text-slate-900">
                No media assets found
              </div>
              <p className="mt-1 text-sm text-slate-500">
                  No assets match the current filters.
              </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Asset</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Source</th>
                        <th className="px-5 py-3 font-semibold">Event</th>
                        <th className="px-5 py-3 font-semibold">Size</th>
                        <th className="px-5 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assets.map((asset) => (
                        <tr key={asset.id}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-12 w-16 shrink-0 rounded-md bg-slate-100 bg-cover bg-center ring-1 ring-slate-200"
                                style={{
                                  backgroundImage: asset.thumbnailUrl
                                    ? `url(${asset.thumbnailUrl})`
                                    : undefined,
                                }}
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-950">
                                  {asset.title}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                  <span>{formatEnum(asset.assetType)}</span>
                                  {asset.durationSeconds ? (
                                    <span>{formatDuration(asset.durationSeconds)}</span>
                                  ) : null}
                                  {asset.markers.length > 0 ? (
                                    <span>{asset.markers.length} markers</span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={asset.status} />
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatEnum(asset.source)}
                          </td>
                          <td className="px-5 py-4">
                            {asset.event ? (
                              <Link
                                href={`/events/${asset.event.id}/media`}
                                className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
                              >
                                {asset.event.title}
                              </Link>
                            ) : (
                              <span className="text-sm text-slate-500">
                                Unattached
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatBytes(asset.sizeBytes)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {asset.playbackUrl ? (
                                <a
                                  href={asset.playbackUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                                  aria-label="Open asset link"
                                  title="Open asset link"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </a>
                              ) : null}
                              {canManageMedia && asset.status !== 'ARCHIVED' ? (
                                <button
                                  type="button"
                                  onClick={() => archiveMutation.mutate(asset.id)}
                                  disabled={
                                    archiveMutation.isPending &&
                                    archiveMutation.variables === asset.id
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label="Archive media asset"
                                  title="Archive media asset"
                                >
                                  <Archive className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationFooter
                  page={meta?.page ?? 1}
                  totalPages={meta?.totalPages ?? 1}
                  total={meta?.total ?? 0}
                  onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                  onNext={() =>
                    setPage((current) =>
                      Math.min(meta?.totalPages ?? 1, current + 1),
                    )
                  }
                />
              </>
            )}
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Create asset
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Register replay, recording or resource metadata.
              </p>
            </div>
            <Library className="h-5 w-5 text-emerald-600" />
          </div>
          {canManageMedia ? (
            <form className="space-y-5 p-5" onSubmit={handleCreateAsset}>
              <TextInput
                label="Title"
                value={formState.title}
                onChange={(value) =>
                  setFormState((current) => ({ ...current, title: value }))
                }
                placeholder="Replay asset title"
              />
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
                  className={`${inputClassName} min-h-24 py-3`}
                  placeholder="Short operational note"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <FormSelect
                  label="Asset type"
                  value={formState.assetType}
                  options={assetTypes.filter(
                    (option): option is MediaAssetType => option !== 'ALL',
                  )}
                  onChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      assetType: value as MediaAssetType,
                    }))
                  }
                />
                <FormSelect
                  label="Source"
                  value={formState.source}
                  options={sources.filter(
                    (option): option is MediaAssetSource => option !== 'ALL',
                  )}
                  onChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      source: value as MediaAssetSource,
                    }))
                  }
                />
                <FormSelect
                  label="Status"
                  value={formState.status}
                  options={statuses.filter(
                    (option): option is MediaAssetStatus => option !== 'ALL',
                  )}
                  onChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      status: value as MediaAssetStatus,
                    }))
                  }
                />
              </div>
              <TextInput
                label="Playback URL"
                value={formState.playbackUrl}
                onChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    playbackUrl: value,
                  }))
                }
                placeholder="https://example.com/media/asset"
              />
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                <Save className="h-4 w-4" />
                {createMutation.isPending ? 'Creating...' : 'Create asset'}
              </button>
            </form>
          ) : (
            <div className="p-5 text-sm text-slate-500">
              Your current role can view the media library but cannot create assets.
            </div>
          )}
        </section>
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
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'ALL' ? label : formatEnum(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormSelect({
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
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClassName} h-10`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatEnum(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
        placeholder={placeholder}
      />
    </label>
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

function PaginationFooter({
  page,
  totalPages,
  total,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-500">
        Page {page} of {totalPages} / {total} assets
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function MediaTableSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

function buildMediaQuery({
  search,
  assetType,
  source,
  status,
  page,
}: {
  search: string;
  assetType: 'ALL' | MediaAssetType;
  source: 'ALL' | MediaAssetSource;
  status: 'ALL' | MediaAssetStatus;
  page: number;
}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '8',
  });

  if (search.trim()) {
    params.set('search', search.trim());
  }

  if (assetType !== 'ALL') {
    params.set('assetType', assetType);
  }

  if (source !== 'ALL') {
    params.set('source', source);
  }

  if (status !== 'ALL') {
    params.set('status', status);
  }

  return params.toString();
}

function buildSummary(assets: MediaAsset[], total: number) {
  return {
    total,
    ready: assets.filter((asset) => asset.status === 'READY').length,
    replays: assets.filter((asset) => asset.assetType === 'REPLAY').length,
    processing: assets.filter((asset) => asset.status === 'PROCESSING').length,
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

function formatBytes(value: number | null) {
  if (!value) {
    return '-';
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} GB`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} MB`;
  }

  return `${value} B`;
}

const inputClassName =
  'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';
