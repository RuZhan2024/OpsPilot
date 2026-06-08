'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { ApiError } from '@/lib/api-client';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  workspaceName: z
    .string()
    .min(2, 'Workspace name must be at least 2 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerAccount, isAuthenticated, isLoading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      workspaceName: '',
    },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerAccount(values);
      toast.success('Workspace created');
      router.replace('/dashboard');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to create account';
      toast.error(message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_460px]">
        <section className="hidden lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-600 text-white">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-semibold">OpsPilot</div>
              <div className="text-sm text-slate-500">
                Production-style event operations
              </div>
            </div>
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight text-slate-950">
            Create a workspace for your event operations team.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Start with an admin account, then manage events, access rules,
            content readiness, analytics and recommendations from one SaaS
            console.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <div className="text-2xl font-semibold">Create account</div>
            <p className="mt-2 text-sm text-slate-500">
              Register a new workspace and become its admin.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-700"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                {...register('name')}
              />
              {errors.name ? (
                <p className="mt-2 text-sm text-red-600">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

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
                htmlFor="workspaceName"
                className="text-sm font-medium text-slate-700"
              >
                Workspace name
              </label>
              <input
                id="workspaceName"
                type="text"
                autoComplete="organization"
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                {...register('workspaceName')}
              />
              {errors.workspaceName ? (
                <p className="mt-2 text-sm text-red-600">
                  {errors.workspaceName.message}
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
                autoComplete="new-password"
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
              Create workspace
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-500">
            Already have a demo account?{' '}
            <Link
              href="/login"
              className="font-semibold text-emerald-700 transition hover:text-emerald-800"
            >
              Sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
