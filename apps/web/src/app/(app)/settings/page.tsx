'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Building2,
  CalendarDays,
  CircleAlert,
  Loader2,
  Save,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type WorkspaceSettings = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  counts: {
    members: number;
    events: number;
    audienceGroups: number;
    auditLogs: number;
  };
};

const settingsSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const workspaceQuery = useQuery({
    queryKey: ['workspaces', 'current'],
    queryFn: () => apiRequest<WorkspaceSettings>('/workspaces/current'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (workspaceQuery.data) {
      reset({
        name: workspaceQuery.data.name,
      });
    }
  }, [reset, workspaceQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      apiRequest<WorkspaceSettings>('/workspaces/current', {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: async (workspace) => {
      reset({
        name: workspace.name,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspaces', 'current'] }),
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] }),
      ]);
      toast.success('Workspace settings saved');
    },
    onError: () => {
      toast.error('Workspace settings could not be saved');
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateMutation.mutate({
      name: values.name.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Workspace identity, access context and operational metadata.
        </p>
      </div>

      {workspaceQuery.isLoading ? (
        <SettingsSkeleton />
      ) : workspaceQuery.isError || !workspaceQuery.data ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Workspace settings could not be loaded.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Users}
              label="Members"
              value={workspaceQuery.data.counts.members}
              detail="Workspace users"
            />
            <SummaryCard
              icon={CalendarDays}
              label="Events"
              value={workspaceQuery.data.counts.events}
              detail="Operational records"
            />
            <SummaryCard
              icon={Building2}
              label="Audience groups"
              value={workspaceQuery.data.counts.audienceGroups}
              detail="Access segments"
            />
            <SummaryCard
              icon={Activity}
              label="Audit logs"
              value={workspaceQuery.data.counts.auditLogs}
              detail="Recorded actions"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-950">
                  Workspace profile
                </h2>
              </div>
              <form className="space-y-5 p-5" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label
                    htmlFor="workspace-name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Workspace name
                  </label>
                  <input
                    id="workspace-name"
                    type="text"
                    disabled={!isAdmin || updateMutation.isPending}
                    className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    {...register('name')}
                  />
                  {errors.name ? (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <MetadataField label="Workspace slug" value={workspaceQuery.data.slug} />
                  <MetadataField
                    label="Created"
                    value={formatDate(workspaceQuery.data.createdAt)}
                  />
                  <MetadataField
                    label="Last updated"
                    value={formatDate(workspaceQuery.data.updatedAt)}
                  />
                  <MetadataField label="Your role" value={formatEnum(user?.role ?? '')} />
                </div>

                {!isAdmin ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <div className="flex items-start gap-3">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">Read-only access</div>
                        <p className="mt-1 leading-6">
                          Workspace profile changes are limited to Admin users.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {isAdmin ? (
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!isDirty || updateMutation.isPending}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      {updateMutation.isPending ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Save className="h-4 w-4" aria-hidden="true" />
                      )}
                      Save changes
                    </button>
                  </div>
                ) : null}
              </form>
            </div>

            <div className="space-y-6">
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-950">
                    Access model
                  </h2>
                </div>
                <div className="space-y-4 p-5">
                  <RoleRow role="ADMIN" description="Manage workspace settings and users" />
                  <RoleRow
                    role="EVENT MANAGER"
                    description="Operate owned events and setup workflows"
                  />
                  <RoleRow role="ANALYST" description="Review analytics and reports" />
                  <RoleRow role="VIEWER" description="Read workspace overview data" />
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-950">
                    Current session
                  </h2>
                </div>
                <div className="space-y-4 p-5">
                  <SessionLine label="Name" value={user?.name ?? ''} />
                  <SessionLine label="Email" value={user?.email ?? ''} />
                  <SessionLine label="Role" value={formatEnum(user?.role ?? '')} />
                </div>
              </section>
            </div>
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
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <Icon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{detail}</div>
    </div>
  );
}

function MetadataField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function RoleRow({ role, description }: { role: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{role}</div>
        <div className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </div>
      </div>
    </div>
  );
}

function SessionLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="truncate text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function SettingsSkeleton() {
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
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
