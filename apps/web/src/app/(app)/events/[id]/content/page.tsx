'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  FileText,
  Link as LinkIcon,
  Megaphone,
  Pencil,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type ContentModuleType =
  | 'AGENDA'
  | 'SPEAKER'
  | 'RESOURCE_LINK'
  | 'ANNOUNCEMENT'
  | 'CTA_BUTTON'
  | 'REPLAY_SECTION';

type EventSummary = {
  id: string;
  title: string;
  status: string;
};

type ContentModule = {
  id: string;
  eventId: string;
  type: ContentModuleType;
  title: string;
  content: string | null;
  metadata: Record<string, unknown> | null;
  order: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

type ContentFormState = {
  type: Extract<
    ContentModuleType,
    'AGENDA' | 'SPEAKER' | 'RESOURCE_LINK' | 'ANNOUNCEMENT'
  >;
  title: string;
  content: string;
  order: number;
  isVisible: boolean;
  agendaStartTime: string;
  agendaEndTime: string;
  agendaSpeaker: string;
  speakerName: string;
  speakerRole: string;
  speakerAvatarUrl: string;
  speakerBio: string;
  resourceUrl: string;
  resourceLabel: string;
};

const moduleTypes: ContentFormState['type'][] = [
  'AGENDA',
  'SPEAKER',
  'RESOURCE_LINK',
  'ANNOUNCEMENT',
];

const defaultFormState: ContentFormState = {
  type: 'AGENDA',
  title: '',
  content: '',
  order: 0,
  isVisible: true,
  agendaStartTime: '10:00',
  agendaEndTime: '10:30',
  agendaSpeaker: '',
  speakerName: '',
  speakerRole: '',
  speakerAvatarUrl: '',
  speakerBio: '',
  resourceUrl: '',
  resourceLabel: '',
};

const moduleIcons = {
  AGENDA: FileText,
  SPEAKER: UserRound,
  RESOURCE_LINK: LinkIcon,
  ANNOUNCEMENT: Megaphone,
  CTA_BUTTON: LinkIcon,
  REPLAY_SECTION: FileText,
} satisfies Record<ContentModuleType, React.ComponentType<{ className?: string }>>;

export default function EventContentPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [formState, setFormState] =
    useState<ContentFormState>(defaultFormState);

  const canManageContent =
    user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const eventQuery = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiRequest<EventSummary>(`/events/${eventId}`),
    enabled: Boolean(eventId),
  });

  const contentModulesQuery = useQuery({
    queryKey: ['events', eventId, 'content-modules'],
    queryFn: () =>
      apiRequest<ContentModule[]>(`/events/${eventId}/content-modules`),
    enabled: Boolean(eventId),
  });

  const modules = useMemo(
    () => contentModulesQuery.data ?? [],
    [contentModulesQuery.data],
  );

  const nextOrder = modules.length;
  const previewPayload = buildPayload(
    {
      ...formState,
      order: selectedModuleId ? formState.order : nextOrder,
    },
    eventId,
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload(
        {
          ...formState,
          order: selectedModuleId ? formState.order : nextOrder,
        },
        eventId,
      );

      if (selectedModuleId) {
        return apiRequest<ContentModule>(`/content-modules/${selectedModuleId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      return apiRequest<ContentModule>(`/events/${eventId}/content-modules`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await invalidateContentQueries(queryClient, eventId);
      setSelectedModuleId(null);
      setFormState(defaultFormState);
      toast.success('Content module saved');
    },
    onError: () => {
      toast.error('Content module could not be saved');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string; deleted: boolean }>(`/content-modules/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient, eventId);
      toast.success('Content module deleted');
    },
    onError: () => {
      toast.error('Content module could not be deleted');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (updatedModules: ContentModule[]) =>
      apiRequest<ContentModule[]>(
        `/events/${eventId}/content-modules/reorder`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            items: updatedModules.map((module, index) => ({
              id: module.id,
              order: index,
            })),
          }),
        },
      ),
    onSuccess: async () => {
      await invalidateContentQueries(queryClient, eventId);
      toast.success('Content modules reordered');
    },
    onError: () => {
      toast.error('Content modules could not be reordered');
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formState.title.trim().length < 2) {
      toast.error('Title must be at least 2 characters');
      return;
    }

    if (formState.type === 'RESOURCE_LINK' && !formState.resourceUrl.trim()) {
      toast.error('Resource link modules require a URL');
      return;
    }

    await saveMutation.mutateAsync();
  };

  const moveModule = (moduleId: string, direction: 'up' | 'down') => {
    const currentIndex = modules.findIndex((module) => module.id === moduleId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= modules.length) {
      return;
    }

    const updatedModules = [...modules];
    const [module] = updatedModules.splice(currentIndex, 1);
    updatedModules.splice(targetIndex, 0, module);
    reorderMutation.mutate(updatedModules);
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

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Content builder
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {eventQuery.data?.title ??
              'Configure agenda, speaker, resource and announcement modules.'}
          </p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          {modules.length} module{modules.length === 1 ? '' : 's'}
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">
              Module editor
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Build structured page content without touching event operations.
            </p>
          </div>

          {canManageContent ? (
            <form className="space-y-5 p-5" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Module type
                </label>
                <select
                  value={formState.type}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...defaultFormState,
                      type: event.target.value as ContentFormState['type'],
                      order: current.order,
                      isVisible: current.isVisible,
                    }))
                  }
                  className={inputClassName}
                >
                  {moduleTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatEnum(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className={inputClassName}
                  placeholder="Opening keynote"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Content
                </label>
                <textarea
                  value={formState.content}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  className={`${inputClassName} min-h-24 py-3`}
                  placeholder="Add supporting context for this module."
                />
              </div>

              <MetadataFields
                formState={formState}
                setFormState={setFormState}
              />

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={formState.isVisible}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      isVisible: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    Visible on event page
                  </span>
                  <span className="block text-xs text-slate-500">
                    Hidden modules stay in the builder but are not shown in
                    preview.
                  </span>
                </span>
              </label>

              <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Draft preview
                </div>
                <PreviewModule module={previewPayload} />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {selectedModuleId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModuleId(null);
                      setFormState(defaultFormState);
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel edit
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {selectedModuleId ? 'Update module' : 'Add module'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-5 text-sm text-slate-500">
              Your current role can view content modules but cannot change them.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-950">
                Content modules
              </h2>
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>

            {contentModulesQuery.isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}
              </div>
            ) : contentModulesQuery.isError ? (
              <div className="p-5 text-sm text-red-600">
                Content modules could not be loaded.
              </div>
            ) : modules.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-sm font-medium text-slate-900">
                  No content modules yet
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Add agenda, speaker or resource modules to improve readiness.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {modules.map((module, index) => (
                  <div key={module.id} className="p-5">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <ContentModuleSummary module={module} />
                      {canManageContent ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={index === 0 || reorderMutation.isPending}
                            onClick={() => moveModule(module.id, 'up')}
                            className={iconButtonClassName}
                            aria-label="Move module up"
                          >
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={
                              index === modules.length - 1 ||
                              reorderMutation.isPending
                            }
                            onClick={() => moveModule(module.id, 'down')}
                            className={iconButtonClassName}
                            aria-label="Move module down"
                          >
                            <ArrowDown
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedModuleId(module.id);
                              setFormState(toFormState(module));
                            }}
                            className={iconButtonClassName}
                            aria-label="Edit content module"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(module.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Delete content module"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-950">
                Event page preview
              </h2>
              <Eye className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-4 p-5">
              {modules.filter((module) => module.isVisible).length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No visible modules to preview.
                </div>
              ) : (
                modules
                  .filter((module) => module.isVisible)
                  .map((module) => (
                    <PreviewModule key={module.id} module={module} />
                  ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetadataFields({
  formState,
  setFormState,
}: {
  formState: ContentFormState;
  setFormState: React.Dispatch<React.SetStateAction<ContentFormState>>;
}) {
  if (formState.type === 'AGENDA') {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <MetadataInput
          label="Start"
          value={formState.agendaStartTime}
          onChange={(value) =>
            setFormState((current) => ({
              ...current,
              agendaStartTime: value,
            }))
          }
        />
        <MetadataInput
          label="End"
          value={formState.agendaEndTime}
          onChange={(value) =>
            setFormState((current) => ({
              ...current,
              agendaEndTime: value,
            }))
          }
        />
        <MetadataInput
          label="Speaker"
          value={formState.agendaSpeaker}
          onChange={(value) =>
            setFormState((current) => ({
              ...current,
              agendaSpeaker: value,
            }))
          }
        />
      </div>
    );
  }

  if (formState.type === 'SPEAKER') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <MetadataInput
          label="Name"
          value={formState.speakerName}
          onChange={(value) =>
            setFormState((current) => ({ ...current, speakerName: value }))
          }
        />
        <MetadataInput
          label="Role"
          value={formState.speakerRole}
          onChange={(value) =>
            setFormState((current) => ({ ...current, speakerRole: value }))
          }
        />
        <MetadataInput
          label="Avatar URL"
          value={formState.speakerAvatarUrl}
          onChange={(value) =>
            setFormState((current) => ({
              ...current,
              speakerAvatarUrl: value,
            }))
          }
        />
        <MetadataInput
          label="Bio"
          value={formState.speakerBio}
          onChange={(value) =>
            setFormState((current) => ({ ...current, speakerBio: value }))
          }
        />
      </div>
    );
  }

  if (formState.type === 'RESOURCE_LINK') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <MetadataInput
          label="URL"
          value={formState.resourceUrl}
          onChange={(value) =>
            setFormState((current) => ({ ...current, resourceUrl: value }))
          }
        />
        <MetadataInput
          label="Label"
          value={formState.resourceLabel}
          onChange={(value) =>
            setFormState((current) => ({ ...current, resourceLabel: value }))
          }
        />
      </div>
    );
  }

  return null;
}

function MetadataInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </label>
  );
}

function ContentModuleSummary({ module }: { module: ContentModule }) {
  const Icon = moduleIcons[module.type];

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        <div className="font-medium text-slate-950">{module.title}</div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {formatEnum(module.type)}
        </span>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
          #{module.order}
        </span>
        {module.isVisible ? (
          <Eye className="h-4 w-4 text-slate-400" aria-label="Visible" />
        ) : (
          <EyeOff className="h-4 w-4 text-slate-400" aria-label="Hidden" />
        )}
      </div>
      {module.content ? (
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
          {module.content}
        </p>
      ) : null}
      <div className="mt-3 text-xs text-slate-500">
        {summarizeMetadata(module)}
      </div>
    </div>
  );
}

function PreviewModule({ module }: { module: ContentModule | PreviewPayload }) {
  const Icon = moduleIcons[module.type];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {formatEnum(module.type)}
        </span>
      </div>
      <h3 className="text-base font-semibold text-slate-950">{module.title}</h3>
      {module.content ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {module.content}
        </p>
      ) : null}
      <div className="mt-3 text-sm text-slate-500">
        {summarizeMetadata(module)}
      </div>
    </article>
  );
}

type PreviewPayload = {
  type: ContentModuleType;
  title: string;
  content?: string | null;
  metadata: Record<string, unknown> | null;
  order: number;
  isVisible: boolean;
};

type ContentModulePayload = {
  eventId: string;
  type: ContentFormState['type'];
  title: string;
  content?: string;
  metadata: Record<string, unknown>;
  order: number;
  isVisible: boolean;
};

function buildPayload(
  formState: ContentFormState,
  eventId: string,
): ContentModulePayload {
  const content = formState.content.trim();

  return {
    eventId,
    type: formState.type,
    title: formState.title.trim(),
    content: content || undefined,
    metadata: buildMetadata(formState),
    order: formState.order,
    isVisible: formState.isVisible,
  };
}

function buildMetadata(formState: ContentFormState) {
  if (formState.type === 'AGENDA') {
    return {
      startTime: formState.agendaStartTime,
      endTime: formState.agendaEndTime,
      speaker: formState.agendaSpeaker,
    };
  }

  if (formState.type === 'SPEAKER') {
    return {
      name: formState.speakerName,
      role: formState.speakerRole,
      avatarUrl: formState.speakerAvatarUrl,
      bio: formState.speakerBio,
    };
  }

  if (formState.type === 'RESOURCE_LINK') {
    return {
      url: formState.resourceUrl,
      label: formState.resourceLabel || formState.title,
    };
  }

  return {};
}

function toFormState(module: ContentModule): ContentFormState {
  const metadata = module.metadata ?? {};

  return {
    ...defaultFormState,
    type:
      module.type === 'CTA_BUTTON' || module.type === 'REPLAY_SECTION'
        ? 'ANNOUNCEMENT'
        : module.type,
    title: module.title,
    content: module.content ?? '',
    order: module.order,
    isVisible: module.isVisible,
    agendaStartTime: getMetadataString(metadata, 'startTime') || '10:00',
    agendaEndTime: getMetadataString(metadata, 'endTime') || '10:30',
    agendaSpeaker: getMetadataString(metadata, 'speaker'),
    speakerName: getMetadataString(metadata, 'name'),
    speakerRole: getMetadataString(metadata, 'role'),
    speakerAvatarUrl: getMetadataString(metadata, 'avatarUrl'),
    speakerBio: getMetadataString(metadata, 'bio'),
    resourceUrl: getMetadataString(metadata, 'url'),
    resourceLabel: getMetadataString(metadata, 'label'),
  };
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  return typeof value === 'string' ? value : '';
}

function summarizeMetadata(module: {
  type: ContentModuleType;
  metadata: Record<string, unknown> | null;
}) {
  const metadata = module.metadata ?? {};

  if (module.type === 'AGENDA') {
    const startTime = getMetadataString(metadata, 'startTime');
    const endTime = getMetadataString(metadata, 'endTime');
    const speaker = getMetadataString(metadata, 'speaker');

    return [startTime && endTime ? `${startTime}-${endTime}` : '', speaker]
      .filter(Boolean)
      .join(' / ');
  }

  if (module.type === 'SPEAKER') {
    return [getMetadataString(metadata, 'name'), getMetadataString(metadata, 'role')]
      .filter(Boolean)
      .join(' / ');
  }

  if (module.type === 'RESOURCE_LINK') {
    return getMetadataString(metadata, 'url');
  }

  return 'Announcement';
}

async function invalidateContentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['events', eventId] }),
    queryClient.invalidateQueries({
      queryKey: ['events', eventId, 'content-modules'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['events', eventId, 'readiness'],
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

const inputClassName =
  'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

const iconButtonClassName =
  'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
