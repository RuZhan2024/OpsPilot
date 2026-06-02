'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import {
  EventForm,
  EventFormValues,
  toDateTimeLocalValue,
  toEventRequestPayload,
} from '@/components/events/event-form';
import { apiRequest } from '@/lib/api-client';

type EventStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

type EventType =
  | 'WEBINAR'
  | 'PRODUCT_LAUNCH'
  | 'TRAINING'
  | 'INTERNAL_LIVESTREAM'
  | 'TOWN_HALL'
  | 'CUSTOMER_ONBOARDING';

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  eventType: EventType;
  status: EventStatus;
  startTime: string;
  endTime: string;
  timezone: string;
  coverImageUrl: string | null;
  registrationTarget: number;
};

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEditEvent = user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const eventQuery = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiRequest<EventDetail>(`/events/${eventId}`),
    enabled: Boolean(eventId) && canEditEvent,
  });

  const mutation = useMutation({
    mutationFn: (values: EventFormValues) =>
      apiRequest<EventDetail>(`/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(toEventRequestPayload(values)),
      }),
    onSuccess: async (event) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['events', event.id] }),
        queryClient.invalidateQueries({
          queryKey: ['events', event.id, 'readiness'],
        }),
      ]);
      toast.success('Event updated');
      router.push(`/events/${event.id}`);
    },
    onError: () => {
      toast.error('Event could not be updated');
    },
  });

  if (!canEditEvent) {
    return <PermissionNotice action="edit events" />;
  }

  if (eventQuery.isLoading) {
    return <EventFormSkeleton />;
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Event could not be loaded.
      </div>
    );
  }

  return (
    <EventForm
      mode="edit"
      initialValues={{
        title: eventQuery.data.title,
        description: eventQuery.data.description ?? '',
        eventType: eventQuery.data.eventType,
        status: eventQuery.data.status,
        startTime: toDateTimeLocalValue(eventQuery.data.startTime),
        endTime: toDateTimeLocalValue(eventQuery.data.endTime),
        timezone: eventQuery.data.timezone,
        registrationTarget: eventQuery.data.registrationTarget,
        coverImageUrl: eventQuery.data.coverImageUrl ?? '',
      }}
      isSubmitting={mutation.isPending}
      onSubmit={async (values) => {
        await mutation.mutateAsync(values);
      }}
    />
  );
}

function EventFormSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="h-8 w-28 animate-pulse rounded-md bg-slate-200" />
      <div className="h-14 w-80 animate-pulse rounded-md bg-slate-200" />
      <div className="h-[520px] animate-pulse rounded-lg bg-white" />
    </div>
  );
}

function PermissionNotice({ action }: { action: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Your current role does not allow you to {action}.
    </div>
  );
}
