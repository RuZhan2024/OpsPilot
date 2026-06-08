import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard',
  replace: vi.fn(),
  logout: vi.fn(),
  authState: {
    user: {
      id: 'user-1',
      name: 'Alice Admin',
      email: 'admin@opspilot.dev',
      workspaceId: 'workspace-1',
      role: 'ADMIN',
    },
    isLoading: false,
    isAuthenticated: true,
    logout: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock('./auth-provider', () => ({
  useAuth: () => mocks.authState,
}));

describe('AppShell', () => {
  beforeEach(() => {
    mocks.pathname = '/dashboard';
    mocks.replace.mockClear();
    mocks.authState = {
      user: {
        id: 'user-1',
        name: 'Alice Admin',
        email: 'admin@opspilot.dev',
        workspaceId: 'workspace-1',
        role: 'ADMIN',
      },
      isLoading: false,
      isAuthenticated: true,
      logout: mocks.logout,
    };
  });

  it('shows admin-only navigation for workspace admins', () => {
    render(<AppShell>Dashboard content</AppShell>);

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.queryAllByText('Users')).not.toHaveLength(0);
    expect(screen.queryAllByText('Audit Logs')).not.toHaveLength(0);
  });

  it('hides admin-only navigation for analysts', () => {
    mocks.authState = {
      ...mocks.authState,
      user: {
        ...mocks.authState.user,
        name: 'Anna Analyst',
        email: 'analyst@opspilot.dev',
        role: 'ANALYST',
      },
    };

    render(<AppShell>Analytics content</AppShell>);

    expect(screen.getByText('Analytics content')).toBeInTheDocument();
    expect(screen.queryAllByText('Users')).toHaveLength(0);
    expect(screen.queryAllByText('Audit Logs')).toHaveLength(0);
  });

  it('redirects unauthenticated users to login with the current path', async () => {
    mocks.authState = {
      ...mocks.authState,
      user: null,
      isAuthenticated: false,
    };

    render(<AppShell>Protected content</AppShell>);

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/login?redirect=%2Fdashboard');
    });
  });
});
