'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import {
  EventForm,
  EventFormValues,
  getDefaultEventFormValues,
  toEventRequestPayload,
} from '@/components/events/event-form';
import { apiRequest } from '@/lib/api-client';

type CreatedEvent = {
  id: string;
};

export default function NewEventPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canCreateEvent = user?.role === 'ADMIN' || user?.role === 'EVENT_MANAGER';

  const mutation = useMutation({
    mutationFn: (values: EventFormValues) =>
      apiRequest<CreatedEvent>('/events', {
        method: 'POST',
        body: JSON.stringify(toEventRequestPayload(values)),
      }),
    onSuccess: async (event) => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created');
      router.push(`/events/${event.id}`);
    },
    onError: () => {
      toast.error('Event could not be created');
    },
  });

  if (!canCreateEvent) {
    return <PermissionNotice action="create events" />;
  }

  return (
    <EventForm
      mode="create"
      initialValues={getDefaultEventFormValues()}
      isSubmitting={mutation.isPending}
      onSubmit={async (values) => {
        await mutation.mutateAsync(values);
      }}
    />
  );
}

function PermissionNotice({ action }: { action: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Your current role does not allow you to {action}.
    </div>
  );
}
