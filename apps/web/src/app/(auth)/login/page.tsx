'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-provider';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const demoAccounts = [
  { label: 'Admin', email: 'admin@opspilot.dev' },
  { label: 'Manager', email: 'manager@opspilot.dev' },
  { label: 'Analyst', email: 'analyst@opspilot.dev' },
  { label: 'Viewer', email: 'viewer@opspilot.dev' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@opspilot.dev',
      password: 'password123',
    },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
      toast.success('Signed in');
      router.replace('/dashboard');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to sign in';
      toast.error(message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-600 text-white">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-semibold">OpsPilot</div>
              <div className="text-sm text-slate-500">
                AI-assisted event operations
              </div>
            </div>
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight text-slate-950">
            Operate webinars, launches and internal livestreams from one
            focused workspace.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Manage audience rules, content readiness, engagement signals and
            operational recommendations with a production-style SaaS workflow.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <div className="text-2xl font-semibold">Sign in</div>
            <p className="mt-2 text-sm text-slate-500">
              Use a demo account to enter the OpsPilot admin console.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                {...register('email')}
              />
              {errors.email ? (
                <p className="mt-2 text-sm text-red-600">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                {...register('password')}
              />
              {errors.password ? (
                <p className="mt-2 text-sm text-red-600">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
              Sign in
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Demo accounts
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setValue('email', account.email, {
                      shouldValidate: true,
                    });
                    setValue('password', 'password123', {
                      shouldValidate: true,
                    });
                  }}
                  className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span className="block font-medium text-slate-800">
                    {account.label}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {account.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

