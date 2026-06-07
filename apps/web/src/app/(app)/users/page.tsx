'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  CalendarDays,
  CircleAlert,
  Crown,
  Search,
  UserRoundCog,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { apiRequest } from '@/lib/api-client';
import type { UserRole } from '@/lib/auth';

type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  workspaceMemberId: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  counts: {
    createdEvents: number;
    auditLogs: number;
  };
};

const roleOptions: UserRole[] = ['ADMIN', 'EVENT_MANAGER', 'ANALYST', 'VIEWER'];

const roleStyles: Record<UserRole, string> = {
  ADMIN: 'bg-red-50 text-red-700 ring-red-100',
  EVENT_MANAGER: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  ANALYST: 'bg-blue-50 text-blue-700 ring-blue-100',
  VIEWER: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const roleDescriptions: Record<UserRole, string> = {
  ADMIN: 'Full workspace administration',
  EVENT_MANAGER: 'Create and manage owned events',
  ANALYST: 'Read analytics and operational data',
  VIEWER: 'Read-only workspace access',
};

export default function UsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const isAdmin = user?.role === 'ADMIN';

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest<WorkspaceUser[]>('/users'),
    enabled: isAdmin,
    retry: false,
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((workspaceUser) => {
      return [
        workspaceUser.name,
        workspaceUser.email,
        formatEnum(workspaceUser.role),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [searchTerm, users]);

  const summary = useMemo(() => buildSummary(users), [users]);

  const updateRoleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: UserRole;
    }) =>
      apiRequest<WorkspaceUser>(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] }),
      ]);
      toast.success('User role updated');
    },
    onError: () => {
      toast.error('User role could not be updated');
    },
  });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader userCount={users.length} />
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5" aria-hidden="true" />
            <div>
              <div className="font-semibold">Admin access required</div>
              <p className="mt-1 leading-6">
                User and role management is limited to workspace Admin users.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader userCount={users.length} />

      {usersQuery.isLoading ? (
        <UsersSkeleton />
      ) : usersQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Users could not be loaded.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Users}
              label="Workspace users"
              value={users.length}
              detail="Active demo accounts"
            />
            <SummaryCard
              icon={Crown}
              label="Admins"
              value={summary.admins}
              detail="Can manage roles"
            />
            <SummaryCard
              icon={CalendarDays}
              label="Event managers"
              value={summary.eventManagers}
              detail="Can operate events"
            />
            <SummaryCard
              icon={Activity}
              label="Audit actions"
              value={summary.auditLogs}
              detail="Actor-attributed logs"
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Workspace members
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage demo account roles for RBAC testing and portfolio
                  walkthroughs.
                </p>
              </div>

              <label className="relative block md:w-80">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Search users or roles"
                />
              </label>
            </div>

            {users.length === 0 ? (
              <EmptyUsers />
            ) : filteredUsers.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-sm font-medium text-slate-900">
                  No users match your search
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Try another name, email address or role.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">User</th>
                      <th className="px-5 py-3 font-semibold">Role</th>
                      <th className="px-5 py-3 font-semibold">Events</th>
                      <th className="px-5 py-3 font-semibold">Audit Logs</th>
                      <th className="px-5 py-3 font-semibold">Joined</th>
                      <th className="px-5 py-3 font-semibold">Change Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((workspaceUser) => (
                      <tr key={workspaceUser.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-950">
                            {workspaceUser.name}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {workspaceUser.email}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${roleStyles[workspaceUser.role]}`}
                          >
                            {formatEnum(workspaceUser.role)}
                          </span>
                          <div className="mt-2 text-xs text-slate-500">
                            {roleDescriptions[workspaceUser.role]}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-900">
                          {workspaceUser.counts.createdEvents}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-900">
                          {workspaceUser.counts.auditLogs}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDate(workspaceUser.joinedAt)}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={workspaceUser.role}
                            disabled={
                              updateRoleMutation.isPending ||
                              workspaceUser.id === user?.id
                            }
                            onChange={(event) =>
                              updateRoleMutation.mutate({
                                userId: workspaceUser.id,
                                role: event.target.value as UserRole,
                              })
                            }
                            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {formatEnum(role)}
                              </option>
                            ))}
                          </select>
                          {workspaceUser.id === user?.id ? (
                            <div className="mt-2 text-xs text-slate-500">
                              Current user protected
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
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

function PageHeader({ userCount }: { userCount: number }) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Users</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage workspace demo accounts and role-based access control.
        </p>
      </div>
      <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
        {userCount} member{userCount === 1 ? '' : 's'}
      </div>
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

function EmptyUsers() {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        <UserRoundCog className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="mt-4 text-sm font-medium text-slate-900">
        No users yet
      </div>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Seed users should appear here after the workspace is configured.
      </p>
    </div>
  );
}

function UsersSkeleton() {
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
        <div className="h-20 border-b border-slate-200" />
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

function buildSummary(users: WorkspaceUser[]) {
  return {
    admins: users.filter((workspaceUser) => workspaceUser.role === 'ADMIN').length,
    eventManagers: users.filter(
      (workspaceUser) => workspaceUser.role === 'EVENT_MANAGER',
    ).length,
    auditLogs: users.reduce(
      (total, workspaceUser) => total + workspaceUser.counts.auditLogs,
      0,
    ),
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
