'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MailCheck,
  Pencil,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';

type AccessRuleType =
  | 'PUBLIC'
  | 'PRIVATE'
  | 'INVITE_ONLY'
  | 'EMAIL_DOMAIN_RESTRICTED'
  | 'MANUAL_APPROVAL';

type EventSummary = {
  id: string;
  title: string;
  status: string;
  startTime: string;
};

type AccessRule = {
  id: string;
  eventId: string;
  type: AccessRuleType;
  domainWhitelist: string[];
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
};

type Registration = {
  id: string;
  name: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ATTENDED';
  source: string | null;
  createdAt: string;
};

type AccessRuleFormState = {
  type: AccessRuleType;
  domainWhitelist: string;
  requiresApproval: boolean;
};

const defaultFormState: AccessRuleFormState = {
  type: 'PUBLIC',
  domainWhitelist: '',
  requiresApproval: false,
};

const accessTypes: AccessRuleType[] = [
  'PUBLIC',
  'PRIVATE',
  'INVITE_ONLY',
  'EMAIL_DOMAIN_RESTRICTED',
  'MANUAL_APPROVAL',
];

const statusStyles: Record<Registration['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-100',
  APPROVED: 'bg-blue-50 text-blue-700 ring-blue-100',
  REJECTED: 'bg-red-50 text-red-700 ring-red-100',
  ATTENDED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

export default function EventAudiencePage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [formState, setFormState] =
    useState<AccessRuleFormState>(defaultFormState);

  const canManageAccess =
    user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';
  const canViewRegistrations =
    user?.role === 'ADMIN' ||
    user?.role === 'EVENT_MANAGER' ||
    user?.role === 'ANALYST';

  const eventQuery = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiRequest<EventSummary>(`/events/${eventId}`),
    enabled: Boolean(eventId),
  });

  const accessRulesQuery = useQuery({
    queryKey: ['events', eventId, 'access-rules'],
    queryFn: () => apiRequest<AccessRule[]>(`/events/${eventId}/access-rules`),
    enabled: Boolean(eventId),
  });

  const registrationsQuery = useQuery({
    queryKey: ['events', eventId, 'registrations'],
    queryFn: () =>
      apiRequest<Registration[]>(`/events/${eventId}/registrations`),
    enabled: Boolean(eventId) && canViewRegistrations,
  });

  const normalizedDomains = useMemo(
    () => normalizeDomains(formState.domainWhitelist),
    [formState.domainWhitelist],
  );

  const preview = useMemo(
    () =>
      buildAccessRulePreview(
        formState.type,
        normalizedDomains,
        formState.requiresApproval,
      ),
    [formState.requiresApproval, formState.type, normalizedDomains],
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        type: formState.type,
        domainWhitelist: normalizedDomains,
        requiresApproval:
          formState.type === 'MANUAL_APPROVAL' || formState.requiresApproval,
      };

      if (selectedRuleId) {
        return apiRequest<AccessRule>(`/access-rules/${selectedRuleId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      return apiRequest<AccessRule>(`/events/${eventId}/access-rules`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['events', eventId, 'access-rules'],
        }),
        queryClient.invalidateQueries({ queryKey: ['events', eventId] }),
        queryClient.invalidateQueries({
          queryKey: ['events', eventId, 'readiness'],
        }),
      ]);
      setSelectedRuleId(null);
      setFormState(defaultFormState);
      toast.success('Access rule saved');
    },
    onError: () => {
      toast.error('Access rule could not be saved');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string; deleted: boolean }>(`/access-rules/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['events', eventId, 'access-rules'],
        }),
        queryClient.invalidateQueries({ queryKey: ['events', eventId] }),
        queryClient.invalidateQueries({
          queryKey: ['events', eventId, 'readiness'],
        }),
      ]);
      toast.success('Access rule deleted');
    },
    onError: () => {
      toast.error('Access rule could not be deleted');
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      formState.type === 'EMAIL_DOMAIN_RESTRICTED' &&
      normalizedDomains.length === 0
    ) {
      toast.error('Add at least one allowed email domain');
      return;
    }

    await saveMutation.mutateAsync();
  };

  const accessRules = accessRulesQuery.data ?? [];
  const registrations = registrationsQuery.data ?? [];

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
            Audience access
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {eventQuery.data?.title ??
              'Configure who can register and view this event.'}
          </p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          {accessRules.length} rule{accessRules.length === 1 ? '' : 's'}
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Access rule builder
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Preview the rule before applying it to the event.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>

          {canManageAccess ? (
            <form className="space-y-5 p-5" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Access type
                </label>
                <select
                  value={formState.type}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      type: event.target.value as AccessRuleType,
                    }))
                  }
                  className={inputClassName}
                >
                  {accessTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatEnum(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Email domain whitelist
                </label>
                <textarea
                  value={formState.domainWhitelist}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      domainWhitelist: event.target.value,
                    }))
                  }
                  placeholder="company.com, partner.com"
                  className={`${inputClassName} min-h-24 py-3`}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Use commas or new lines. The backend stores normalized domains.
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={
                    formState.type === 'MANUAL_APPROVAL' ||
                    formState.requiresApproval
                  }
                  disabled={formState.type === 'MANUAL_APPROVAL'}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      requiresApproval: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    Require manager approval
                  </span>
                  <span className="block text-xs text-slate-500">
                    Registrations remain pending until approved.
                  </span>
                </span>
              </label>

              <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-100">
                {preview}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {selectedRuleId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRuleId(null);
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
                  {selectedRuleId ? 'Update rule' : 'Create rule'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-5 text-sm text-slate-500">
              Your current role can view access rules but cannot change them.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">
              Current access rules
            </h2>
            <MailCheck className="h-5 w-5 text-emerald-600" />
          </div>

          {accessRulesQuery.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : accessRulesQuery.isError ? (
            <div className="p-5 text-sm text-red-600">
              Access rules could not be loaded.
            </div>
          ) : accessRules.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="text-sm font-medium text-slate-900">
                No access rule configured
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Create one to improve the event readiness score.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {accessRules.map((rule) => (
                <div key={rule.id} className="p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <div className="font-medium text-slate-950">
                        {formatEnum(rule.type)}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {buildAccessRulePreview(
                          rule.type,
                          rule.domainWhitelist,
                          rule.requiresApproval,
                        )}
                      </p>
                    </div>
                    {canManageAccess ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRuleId(rule.id);
                            setFormState({
                              type: rule.type,
                              domainWhitelist: rule.domainWhitelist.join(', '),
                              requiresApproval: rule.requiresApproval,
                            });
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          aria-label="Edit access rule"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(rule.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50"
                          aria-label="Delete access rule"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rule.domainWhitelist.map((domain) => (
                      <span
                        key={domain}
                        className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                      >
                        @{domain}
                      </span>
                    ))}
                    {rule.requiresApproval ? (
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                        Approval required
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Registrations
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Seed data used for access and analytics workflows.
            </p>
          </div>
          <Users className="h-5 w-5 text-emerald-600" />
        </div>

        {!canViewRegistrations ? (
          <div className="p-5 text-sm text-slate-500">
            Your current role cannot view registration records.
          </div>
        ) : registrationsQuery.isLoading ? (
          <div className="p-5">
            <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : registrationsQuery.isError ? (
          <div className="p-5 text-sm text-red-600">
            Registrations could not be loaded.
          </div>
        ) : registrations.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No registrations yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.slice(0, 20).map((registration) => (
                  <tr key={registration.id}>
                    <td className="px-5 py-4 text-sm font-medium text-slate-900">
                      {registration.name}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {registration.email}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusStyles[registration.status]}`}
                      >
                        {formatEnum(registration.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {registration.source ?? 'Direct'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(registration.createdAt)}
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

function normalizeDomains(value: string) {
  const domains = value
    .split(/[,\n]/)
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);

  return Array.from(new Set(domains));
}

function buildAccessRulePreview(
  type: AccessRuleType,
  domains: string[],
  requiresApproval: boolean,
) {
  const approvalText = requiresApproval
    ? ' Registrations require manager approval.'
    : '';

  if (type === 'PUBLIC') {
    return `Anyone with the event link can register.${approvalText}`;
  }

  if (type === 'PRIVATE') {
    return `Only authenticated workspace users can access this event.${approvalText}`;
  }

  if (type === 'INVITE_ONLY') {
    return `Only invited audience members can register or access the replay.${approvalText}`;
  }

  if (type === 'EMAIL_DOMAIN_RESTRICTED') {
    const domainText =
      domains.length > 0
        ? domains.map((domain) => `@${domain}`).join(' or ')
        : 'the configured domains';

    return `Only users with ${domainText} email addresses can register.${approvalText}`;
  }

  return 'Registrations require manager approval before attendees can access the event.';
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
