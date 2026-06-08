'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Copy,
  Eye,
  EyeOff,
  Monitor,
  RadioTower,
  Save,
  Server,
  ShieldCheck,
  Smartphone,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type StreamStatus =
  | 'NOT_CONFIGURED'
  | 'READY'
  | 'RECEIVING_SIGNAL'
  | 'OFFLINE';

type EventSummary = {
  id: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  timezone: string;
};

type StreamSetting = {
  id: string;
  eventId: string;
  ingestServerUrl: string;
  streamKey: string;
  streamStatus: StreamStatus;
  recordingEnabled: boolean;
  lowLatencyMode: boolean;
  speakerTestCompleted: boolean;
  networkCheckCompleted: boolean;
  backupStreamEnabled: boolean;
  viewerUrl: string | null;
  mobileViewerUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type StreamFormState = Pick<
  StreamSetting,
  | 'ingestServerUrl'
  | 'streamKey'
  | 'streamStatus'
  | 'recordingEnabled'
  | 'lowLatencyMode'
  | 'speakerTestCompleted'
  | 'networkCheckCompleted'
  | 'backupStreamEnabled'
> & {
  viewerUrl: string;
  mobileViewerUrl: string;
};

const streamStatuses: StreamStatus[] = [
  'NOT_CONFIGURED',
  'READY',
  'RECEIVING_SIGNAL',
  'OFFLINE',
];

const defaultFormState: StreamFormState = {
  ingestServerUrl: '',
  streamKey: '',
  streamStatus: 'NOT_CONFIGURED',
  recordingEnabled: true,
  lowLatencyMode: false,
  speakerTestCompleted: false,
  networkCheckCompleted: false,
  backupStreamEnabled: false,
  viewerUrl: '',
  mobileViewerUrl: '',
};

const statusStyles: Record<StreamStatus, string> = {
  NOT_CONFIGURED: 'bg-slate-100 text-slate-700 ring-slate-200',
  READY: 'bg-blue-50 text-blue-700 ring-blue-100',
  RECEIVING_SIGNAL: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  OFFLINE: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
};

const statusDescriptions: Record<StreamStatus, string> = {
  NOT_CONFIGURED: 'Encoder details still need review',
  READY: 'Setup is ready for the live session',
  RECEIVING_SIGNAL: 'Signal is currently being received',
  OFFLINE: 'No active stream signal',
};

export default function EventStreamPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [draftState, setDraftState] = useState<{
    eventId: string;
    values: StreamFormState;
  } | null>(null);
  const [isStreamKeyVisible, setIsStreamKeyVisible] = useState(false);

  const canManageStream =
    user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const eventQuery = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiRequest<EventSummary>(`/events/${eventId}`),
    enabled: Boolean(eventId),
  });

  const streamQuery = useQuery({
    queryKey: ['events', eventId, 'stream-settings'],
    queryFn: () =>
      apiRequest<StreamSetting>(`/events/${eventId}/stream-settings`),
    enabled: Boolean(eventId),
  });

  const fetchedFormState = useMemo(
    () =>
      streamQuery.data
        ? toStreamFormState(streamQuery.data)
        : defaultFormState,
    [streamQuery.data],
  );

  const formState =
    draftState?.eventId === eventId ? draftState.values : fetchedFormState;

  const updateFormState = (
    updater: (current: StreamFormState) => StreamFormState,
  ) => {
    setDraftState({
      eventId,
      values: updater(formState),
    });
  };

  const checklist = useMemo(
    () => [
      {
        key: 'network',
        label: 'Network check completed',
        completed: formState.networkCheckCompleted,
      },
      {
        key: 'speaker',
        label: 'Speaker test completed',
        completed: formState.speakerTestCompleted,
      },
      {
        key: 'recording',
        label: 'Recording enabled',
        completed: formState.recordingEnabled,
      },
      {
        key: 'status',
        label: 'Stream marked ready or receiving',
        completed:
          formState.streamStatus === 'READY' ||
          formState.streamStatus === 'RECEIVING_SIGNAL',
      },
    ],
    [
      formState.networkCheckCompleted,
      formState.recordingEnabled,
      formState.speakerTestCompleted,
      formState.streamStatus,
    ],
  );

  const completedChecklistItems = checklist.filter(
    (item) => item.completed,
  ).length;
  const checklistProgress = Math.round(
    (completedChecklistItems / checklist.length) * 100,
  );

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest<StreamSetting>(`/events/${eventId}/stream-settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...formState,
          ingestServerUrl: formState.ingestServerUrl.trim(),
          streamKey: formState.streamKey.trim(),
          viewerUrl: formState.viewerUrl.trim(),
          mobileViewerUrl: formState.mobileViewerUrl.trim(),
        }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['events', eventId, 'stream-settings'],
        }),
        queryClient.invalidateQueries({ queryKey: ['events', eventId] }),
        queryClient.invalidateQueries({
          queryKey: ['events', eventId, 'audit-logs'],
        }),
      ]);
      setDraftState(null);
      toast.success('Stream settings saved');
    },
    onError: () => {
      toast.error('Stream settings could not be saved');
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManageStream) {
      return;
    }

    if (!formState.ingestServerUrl.trim() || !formState.streamKey.trim()) {
      toast.error('Ingest URL and stream key are required');
      return;
    }

    await updateMutation.mutateAsync();
  };

  if (streamQuery.isLoading) {
    return <StreamPageSkeleton />;
  }

  if (streamQuery.isError || !streamQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Stream settings could not be loaded.
      </div>
    );
  }

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
                className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusStyles[formState.streamStatus]}`}
              >
                {formatEnum(formState.streamStatus)}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                Encoder setup
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Stream setup
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {eventQuery.data?.title ??
                'Configure live operations for this event.'}
            </p>
          </div>

          <div className="grid min-w-72 gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <MetricLine
              label="Status"
              value={formatEnum(formState.streamStatus)}
              subValue={statusDescriptions[formState.streamStatus]}
            />
            <MetricLine
              label="Pre-live checks"
              value={`${completedChecklistItems}/${checklist.length}`}
              subValue={`${checklistProgress}% complete`}
            />
            <MetricLine
              label="Last updated"
              value={formatDate(streamQuery.data.updatedAt)}
              subValue={canManageStream ? 'Editable' : 'Read only'}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={RadioTower}
          label="Signal"
          value={formatEnum(formState.streamStatus)}
          detail={statusDescriptions[formState.streamStatus]}
        />
        <SummaryCard
          icon={Video}
          label="Recording"
          value={formState.recordingEnabled ? 'Enabled' : 'Disabled'}
          detail={formState.lowLatencyMode ? 'Low latency mode' : 'Standard mode'}
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Checks"
          value={`${checklistProgress}%`}
          detail={`${completedChecklistItems} of ${checklist.length} complete`}
        />
        <SummaryCard
          icon={Server}
          label="Backup stream"
          value={formState.backupStreamEnabled ? 'Enabled' : 'Disabled'}
          detail="Operational fallback"
        />
      </section>

      <form className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" onSubmit={handleSubmit}>
        <section className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Encoder settings
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  RTMP details for the production team.
                </p>
              </div>
              <Server className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-5 p-5">
              <CopyField
                label="Ingest server URL"
                value={formState.ingestServerUrl}
                disabled={!canManageStream}
                onChange={(value) =>
                  updateFormState((current) => ({
                    ...current,
                    ingestServerUrl: value,
                  }))
                }
                onCopy={() => copyToClipboard(formState.ingestServerUrl)}
              />

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Stream key
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type={isStreamKeyVisible ? 'text' : 'password'}
                    value={formState.streamKey}
                    disabled={!canManageStream}
                    onChange={(event) =>
                      updateFormState((current) => ({
                        ...current,
                        streamKey: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    onClick={() => setIsStreamKeyVisible((current) => !current)}
                    className={iconButtonClassName}
                    aria-label={
                      isStreamKeyVisible ? 'Hide stream key' : 'Show stream key'
                    }
                    title={
                      isStreamKeyVisible ? 'Hide stream key' : 'Show stream key'
                    }
                  >
                    {isStreamKeyVisible ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formState.streamKey)}
                    className={iconButtonClassName}
                    aria-label="Copy stream key"
                    title="Copy stream key"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Stream status
                </label>
                <select
                  value={formState.streamStatus}
                  disabled={!canManageStream}
                  onChange={(event) =>
                    updateFormState((current) => ({
                      ...current,
                      streamStatus: event.target.value as StreamStatus,
                    }))
                  }
                  className={`${inputClassName} h-10`}
                >
                  {streamStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatEnum(status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Viewer links
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Public-facing URLs for preview and QA.
                </p>
              </div>
              <Monitor className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-5 p-5">
              <CopyField
                label="Desktop viewer URL"
                value={formState.viewerUrl}
                disabled={!canManageStream}
                onChange={(value) =>
                  updateFormState((current) => ({
                    ...current,
                    viewerUrl: value,
                  }))
                }
                onCopy={() => copyToClipboard(formState.viewerUrl)}
              />
              <CopyField
                label="Mobile viewer URL"
                value={formState.mobileViewerUrl}
                disabled={!canManageStream}
                onChange={(value) =>
                  updateFormState((current) => ({
                    ...current,
                    mobileViewerUrl: value,
                  }))
                }
                onCopy={() => copyToClipboard(formState.mobileViewerUrl)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Pre-live checklist
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Operational checks before the session starts.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-4 p-5">
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-emerald-600"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
              <ToggleRow
                label="Network check completed"
                checked={formState.networkCheckCompleted}
                disabled={!canManageStream}
                onChange={(checked) =>
                  updateFormState((current) => ({
                    ...current,
                    networkCheckCompleted: checked,
                  }))
                }
              />
              <ToggleRow
                label="Speaker test completed"
                checked={formState.speakerTestCompleted}
                disabled={!canManageStream}
                onChange={(checked) =>
                  updateFormState((current) => ({
                    ...current,
                    speakerTestCompleted: checked,
                  }))
                }
              />
              <ToggleRow
                label="Recording enabled"
                checked={formState.recordingEnabled}
                disabled={!canManageStream}
                onChange={(checked) =>
                  updateFormState((current) => ({
                    ...current,
                    recordingEnabled: checked,
                  }))
                }
              />
              <ToggleRow
                label="Low latency mode"
                checked={formState.lowLatencyMode}
                disabled={!canManageStream}
                onChange={(checked) =>
                  updateFormState((current) => ({
                    ...current,
                    lowLatencyMode: checked,
                  }))
                }
              />
              <ToggleRow
                label="Backup stream enabled"
                checked={formState.backupStreamEnabled}
                disabled={!canManageStream}
                onChange={(checked) =>
                  updateFormState((current) => ({
                    ...current,
                    backupStreamEnabled: checked,
                  }))
                }
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-950">
                QR preview
              </h2>
              <Smartphone className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="p-5">
              <div className="mx-auto grid aspect-square w-full max-w-56 grid-cols-5 gap-1 rounded-lg border border-slate-200 bg-white p-4">
                {Array.from({ length: 25 }).map((_, index) => (
                  <div
                    key={index}
                    className={`rounded-sm ${
                      index % 2 === 0 || index % 7 === 0
                        ? 'bg-slate-900'
                        : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-4 truncate text-center text-xs text-slate-500">
                {formState.mobileViewerUrl || 'Mobile viewer URL unavailable'}
              </p>
            </div>
          </div>

          {!canManageStream ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
              Your current role can view stream setup but cannot change it.
            </div>
          ) : (
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {updateMutation.isPending ? 'Saving...' : 'Save stream setup'}
            </button>
          )}
        </section>
      </form>
    </div>
  );
}

function CopyField({
  label,
  value,
  disabled,
  onChange,
  onCopy,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onCopy: () => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
        />
        <button
          type="button"
          onClick={onCopy}
          className={iconButtonClassName}
          aria-label={`Copy ${label}`}
          title={`Copy ${label}`}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function toStreamFormState(streamSetting: StreamSetting): StreamFormState {
  return {
    ingestServerUrl: streamSetting.ingestServerUrl,
    streamKey: streamSetting.streamKey,
    streamStatus: streamSetting.streamStatus,
    recordingEnabled: streamSetting.recordingEnabled,
    lowLatencyMode: streamSetting.lowLatencyMode,
    speakerTestCompleted: streamSetting.speakerTestCompleted,
    networkCheckCompleted: streamSetting.networkCheckCompleted,
    backupStreamEnabled: streamSetting.backupStreamEnabled,
    viewerUrl: streamSetting.viewerUrl ?? '',
    mobileViewerUrl: streamSetting.mobileViewerUrl ?? '',
  };
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
      <span className="flex min-w-0 items-center gap-3">
        {checked ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <CircleAlert className="h-4 w-4 text-slate-400" />
        )}
        <span className="truncate text-sm font-medium text-slate-800">
          {label}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 disabled:cursor-not-allowed"
      />
    </label>
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
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <Icon className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="mt-3 truncate text-2xl font-semibold text-slate-950">
        {value}
      </div>
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

function StreamPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-28 animate-pulse rounded-md bg-slate-200" />
      <div className="h-40 animate-pulse rounded-lg bg-white" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="h-96 animate-pulse rounded-lg bg-white" />
        <div className="h-96 animate-pulse rounded-lg bg-white" />
      </div>
    </div>
  );
}

async function copyToClipboard(value: string) {
  if (!value.trim()) {
    toast.error('Nothing to copy');
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  } catch {
    toast.error('Copy failed');
  }
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
  'h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const iconButtonClassName =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950';
