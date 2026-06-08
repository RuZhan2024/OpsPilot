import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventForm, type EventFormInputValues } from './event-form';

const validInitialValues: EventFormInputValues = {
  title: 'Q2 Product Launch Webinar',
  description: 'A launch event for enterprise customers.',
  eventType: 'PRODUCT_LAUNCH',
  status: 'DRAFT',
  startTime: '2026-06-10T10:00',
  endTime: '2026-06-10T11:00',
  timezone: 'Europe/London',
  registrationTarget: 150,
  coverImageUrl: '',
};

describe('EventForm', () => {
  it('blocks submission when the end time is before the start time', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <EventForm
        mode="create"
        initialValues={{
          ...validInitialValues,
          endTime: '2026-06-10T09:00',
        }}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect(
      await screen.findByText('End time must be after start time'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid event details with a numeric registration target', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <EventForm
        mode="create"
        initialValues={validInitialValues}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Create event' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Q2 Product Launch Webinar',
          eventType: 'PRODUCT_LAUNCH',
          registrationTarget: 150,
        }),
        expect.any(Object),
      );
    });
  });
});
