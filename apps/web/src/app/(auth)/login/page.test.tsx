import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  login: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  authState: {
    login: vi.fn(),
    isAuthenticated: false,
    isLoading: false,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => mocks.authState,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mocks.replace.mockClear();
    mocks.login.mockReset();
    mocks.login.mockResolvedValue(undefined);
    mocks.toastSuccess.mockClear();
    mocks.toastError.mockClear();
    mocks.authState = {
      login: mocks.login,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  it('shows validation messages before submitting invalid credentials', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.clear(screen.getByLabelText('Email'));
    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Enter a valid email address'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Password must be at least 8 characters'),
    ).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('fills demo account credentials from a demo account button', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /Manager/ }));

    expect(screen.getByLabelText('Email')).toHaveValue('manager@opspilot.dev');
    expect(screen.getByLabelText('Password')).toHaveValue('password123');
  });

  it('submits valid credentials and redirects to dashboard', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'viewer@opspilot.dev');
    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith({
        email: 'viewer@opspilot.dev',
        password: 'password123',
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Signed in');
    expect(mocks.replace).toHaveBeenCalledWith('/dashboard');
  });
});
