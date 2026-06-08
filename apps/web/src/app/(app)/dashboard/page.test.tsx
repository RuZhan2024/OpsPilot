import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithQuery } from '@/test/render';
import DashboardPage from './page';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiRequest: mocks.apiRequest,
}));

const dashboardSummary = {
  kpis: {
    totalEvents: 8,
    upcomingEvents: 4,
    totalRegistrations: 240,
    totalAttendees: 168,
    averageAttendanceRate: 70,
    averageEngagementScore: 74,
    peakConcurrentViewers: 126,
    openHighRiskRecommendations: 2,
  },
  eventReadiness: [
    {
      id: 'event-1',
      title: 'Q2 Product Launch Webinar',
      status: 'SCHEDULED',
      readinessScore: 85,
      registrations: 120,
      registrationTarget: 150,
    },
  ],
  recentRecommendations: [
    {
      id: 'recommendation-1',
      title: 'Registration is below target',
      severity: 'HIGH',
      type: 'AUDIENCE_GROWTH',
      event: {
        title: 'Q2 Product Launch Webinar',
      },
    },
  ],
};

describe('DashboardPage', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset();
    mocks.apiRequest.mockResolvedValue(dashboardSummary);
  });

  it('renders dashboard KPI cards and operational lists from API data', async () => {
    renderWithQuery(<DashboardPage />);

    expect(await screen.findByText('Total events')).toBeInTheDocument();
    expect(screen.getByText('Peak viewers')).toBeInTheDocument();
    expect(screen.getByText('126')).toBeInTheDocument();
    expect(screen.getAllByText('Q2 Product Launch Webinar')).not.toHaveLength(0);
    expect(screen.getByText('Registration is below target')).toBeInTheDocument();
    expect(mocks.apiRequest).toHaveBeenCalledWith('/dashboard/summary');
  });
});
