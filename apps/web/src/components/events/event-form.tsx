'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const eventTypes = [
  'WEBINAR',
  'PRODUCT_LAUNCH',
  'TRAINING',
  'INTERNAL_LIVESTREAM',
  'TOWN_HALL',
  'CUSTOMER_ONBOARDING',
] as const;

const eventStatuses = [
  'DRAFT',
  'SCHEDULED',
  'LIVE',
  'COMPLETED',
  'CANCELLED',
] as const;

const eventFormSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    description: z.string().optional(),
    eventType: z.enum(eventTypes),
    status: z.enum(eventStatuses).optional(),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    timezone: z.string().min(2, 'Timezone is required'),
    registrationTarget: z.coerce
      .number()
      .int('Registration target must be a whole number')
      .min(1, 'Registration target must be at least 1'),
    coverImageUrl: z.string().url('Enter a valid URL').or(z.literal('')),
  })
  .refine((values) => new Date(values.endTime) > new Date(values.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export type EventFormInputValues = z.input<typeof eventFormSchema>;
export type EventFormValues = z.output<typeof eventFormSchema>;

type EventFormProps = {
  mode: 'create' | 'edit';
  initialValues: EventFormInputValues;
  isSubmitting: boolean;
  onSubmit: (values: EventFormValues) => Promise<void>;
};

export function EventForm({
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
}: EventFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormInputValues, unknown, EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialValues,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Events
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-950">
          {mode === 'create' ? 'Create event' : 'Edit event'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure the operational details used across readiness, analytics
          and audience workflows.
        </p>
      </div>

      <form
        className="rounded-lg border border-slate-200 bg-white shadow-sm"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="grid gap-5 border-b border-slate-200 p-5 md:grid-cols-2">
          <Field label="Title" error={errors.title?.message} fullWidth>
            <input
              className={inputClassName}
              placeholder="Q2 Product Launch Webinar"
              {...register('title')}
            />
          </Field>

          <Field label="Description" error={errors.description?.message} fullWidth>
            <textarea
              className={`${inputClassName} min-h-28 resize-y py-3`}
              placeholder="Describe the event goal, audience and operating context."
              {...register('description')}
            />
          </Field>

          <Field label="Event type" error={errors.eventType?.message}>
            <select className={inputClassName} {...register('eventType')}>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {formatEnum(type)}
                </option>
              ))}
            </select>
          </Field>

          {mode === 'edit' ? (
            <Field label="Status" error={errors.status?.message}>
              <select className={inputClassName} {...register('status')}>
                {eventStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatEnum(status)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label="Start time" error={errors.startTime?.message}>
            <input
              type="datetime-local"
              className={inputClassName}
              {...register('startTime')}
            />
          </Field>

          <Field label="End time" error={errors.endTime?.message}>
            <input
              type="datetime-local"
              className={inputClassName}
              {...register('endTime')}
            />
          </Field>

          <Field label="Timezone" error={errors.timezone?.message}>
            <input
              className={inputClassName}
              placeholder="Europe/London"
              {...register('timezone')}
            />
          </Field>

          <Field
            label="Registration target"
            error={errors.registrationTarget?.message}
          >
            <input
              type="number"
              min={1}
              className={inputClassName}
              {...register('registrationTarget')}
            />
          </Field>

          <Field label="Cover image URL" error={errors.coverImageUrl?.message} fullWidth>
            <input
              className={inputClassName}
              placeholder="https://example.com/event-cover.jpg"
              {...register('coverImageUrl')}
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end">
          <Link
            href="/events"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {mode === 'create' ? 'Create event' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function toEventRequestPayload(values: EventFormValues) {
  return {
    title: values.title,
    description: values.description || undefined,
    eventType: values.eventType,
    status: values.status,
    startTime: new Date(values.startTime).toISOString(),
    endTime: new Date(values.endTime).toISOString(),
    timezone: values.timezone,
    registrationTarget: values.registrationTarget,
    coverImageUrl: values.coverImageUrl || undefined,
  };
}

export function toDateTimeLocalValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

export function getDefaultEventFormValues(): EventFormValues {
  const startTime = new Date();
  startTime.setDate(startTime.getDate() + 7);
  startTime.setMinutes(0, 0, 0);

  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 1);

  return {
    title: '',
    description: '',
    eventType: 'WEBINAR',
    status: 'DRAFT',
    startTime: toDateTimeLocalValue(startTime),
    endTime: toDateTimeLocalValue(endTime),
    timezone: 'Europe/London',
    registrationTarget: 100,
    coverImageUrl: '',
  };
}

function Field({
  label,
  error,
  children,
  fullWidth = false,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <label className={fullWidth ? 'md:col-span-2' : undefined}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </label>
  );
}

const inputClassName =
  'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
