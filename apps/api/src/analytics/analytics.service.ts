import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnalyticsSnapshot, EventStatus, Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';

type EventWithDashboardData = Prisma.EventGetPayload<{
  include: {
    analyticsSnapshots: true;
    accessRules: true;
    contentModules: true;
    polls: true;
    _count: {
      select: {
        registrations: true;
        questions: true;
        feedback: true;
      };
    };
  };
}>;

type AudienceRegistration = {
  email: string;
  source?: string | null;
};

type SnapshotSignal = {
  attendees: number;
  averageWatchTime: number;
  engagementScore: number;
  pollParticipationRate: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(user: AuthenticatedUser) {
    const eventWhere = this.getVisibleEventWhere(user);
    const events = await this.prisma.event.findMany({
      where: eventWhere,
      include: {
        analyticsSnapshots: {
          orderBy: {
            date: 'asc',
          },
        },
        accessRules: true,
        contentModules: true,
        polls: true,
        _count: {
          select: {
            registrations: true,
            questions: true,
            feedback: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    const registrations = await this.prisma.registration.findMany({
      where: {
        event: eventWhere,
      },
      select: {
        email: true,
        source: true,
      },
    });

    const recentRecommendations = await this.prisma.recommendation.findMany({
      where: {
        status: 'OPEN',
        event: eventWhere,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            status: true,
            startTime: true,
          },
        },
      },
      orderBy: [
        {
          severity: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: 5,
    });

    const latestSnapshots = events
      .map((event) => this.getLatestSnapshot(event.analyticsSnapshots))
      .filter((snapshot): snapshot is AnalyticsSnapshot => Boolean(snapshot));

    const totalRegistrations = events.reduce((total, event) => {
      const latestSnapshot = this.getLatestSnapshot(event.analyticsSnapshots);

      return (
        total + (latestSnapshot?.registrations ?? event._count.registrations)
      );
    }, 0);
    const totalAttendees = latestSnapshots.reduce(
      (total, snapshot) => total + snapshot.attendees,
      0,
    );
    const averageAttendanceRate = this.getPercentage(
      totalAttendees,
      totalRegistrations,
    );

    return {
      kpis: {
        totalEvents: events.length,
        upcomingEvents: this.countUpcomingEvents(events),
        completedEvents: events.filter(
          (event) => event.status === EventStatus.COMPLETED,
        ).length,
        totalRegistrations,
        totalAttendees,
        averageAttendanceRate,
        averageWatchTime: this.getAverage(
          latestSnapshots.map((snapshot) => snapshot.averageWatchTime),
        ),
        averageEngagementScore: this.getAverage(
          latestSnapshots.map((snapshot) => snapshot.engagementScore),
        ),
        peakConcurrentViewers: this.getPeakConcurrentViewers(latestSnapshots),
        openHighRiskRecommendations: recentRecommendations.filter(
          (recommendation) => recommendation.severity === 'HIGH',
        ).length,
      },
      registrationTrend: this.buildRegistrationTrend(events),
      topEventsByAttendance: this.buildTopEventsByAttendance(events),
      eventReadiness: this.buildEventReadiness(events),
      audienceDomains: this.buildAudienceDomains(registrations),
      deviceBreakdown: this.buildDeviceBreakdown(registrations),
      watchSourceBreakdown: this.buildWatchSourceBreakdown(registrations),
      geographyBreakdown: this.buildGeographyBreakdown(registrations),
      dropOffTrend: this.buildWorkspaceDropOffTrend(latestSnapshots),
      recentRecommendations,
    };
  }

  async getEventAnalytics(user: AuthenticatedUser, eventId: string) {
    const event = await this.findEventForRead(user, eventId);
    const latestSnapshot = this.getLatestSnapshot(event.analyticsSnapshots);
    const registrations = await this.prisma.registration.findMany({
      where: {
        eventId: event.id,
      },
      select: {
        email: true,
        source: true,
        status: true,
      },
    });

    const totalRegistrations =
      latestSnapshot?.registrations ?? event._count.registrations;
    const totalAttendees =
      latestSnapshot?.attendees ??
      registrations.filter((registration) => registration.status === 'ATTENDED')
        .length;

    return {
      event: {
        id: event.id,
        title: event.title,
        eventType: event.eventType,
        status: event.status,
        startTime: event.startTime,
        endTime: event.endTime,
        timezone: event.timezone,
        registrationTarget: event.registrationTarget,
      },
      totals: {
        registrations: totalRegistrations,
        attendees: totalAttendees,
        attendanceRate: this.getPercentage(totalAttendees, totalRegistrations),
        averageWatchTime: latestSnapshot?.averageWatchTime ?? 0,
        engagementScore: latestSnapshot?.engagementScore ?? 0,
        pollParticipationRate: latestSnapshot?.pollParticipationRate ?? 0,
        qaCount: latestSnapshot?.qaCount ?? event._count.questions,
        feedbackScore: latestSnapshot?.feedbackScore ?? 0,
      },
      setup: {
        accessRuleCount: event.accessRules.length,
        contentModuleCount: event.contentModules.length,
        pollCount: event.polls.length,
        questionCount: event._count.questions,
        feedbackCount: event._count.feedback,
      },
      progress: {
        registrationTarget: event.registrationTarget,
        registrationProgress: this.getPercentage(
          totalRegistrations,
          event.registrationTarget,
        ),
      },
      audienceDomains: this.buildAudienceDomains(registrations),
      livestream: {
        peakConcurrentViewers: latestSnapshot
          ? this.estimatePeakConcurrentViewers(latestSnapshot)
          : 0,
        deviceBreakdown: this.buildDeviceBreakdown(registrations),
        watchSourceBreakdown: this.buildWatchSourceBreakdown(registrations),
        geographyBreakdown: this.buildGeographyBreakdown(registrations),
        dropOffTrend: this.buildDropOffTrend(latestSnapshot ?? null),
      },
      latestSnapshot,
    };
  }

  async getEventTimeseries(user: AuthenticatedUser, eventId: string) {
    const event = await this.findEventForRead(user, eventId);

    return event.analyticsSnapshots.map((snapshot, index) => ({
      id: snapshot.id,
      date: snapshot.date,
      registrations: snapshot.registrations,
      attendees: snapshot.attendees,
      peakConcurrentViewers: this.estimatePeakConcurrentViewers(
        snapshot,
        index,
      ),
      attendanceRate: this.getPercentage(
        snapshot.attendees,
        snapshot.registrations,
      ),
      averageWatchTime: snapshot.averageWatchTime,
      engagementScore: snapshot.engagementScore,
      pollParticipationRate: snapshot.pollParticipationRate,
      qaCount: snapshot.qaCount,
      feedbackScore: snapshot.feedbackScore,
    }));
  }

  private async findEventForRead(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        ...this.getVisibleEventWhere(user),
      },
      include: {
        analyticsSnapshots: {
          orderBy: {
            date: 'asc',
          },
        },
        accessRules: true,
        contentModules: true,
        polls: true,
        _count: {
          select: {
            registrations: true,
            questions: true,
            feedback: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertCanAccessEvent(user, event.createdById);

    return event;
  }

  private getVisibleEventWhere(
    user: AuthenticatedUser,
  ): Prisma.EventWhereInput {
    return {
      workspaceId: user.workspaceId,
      archivedAt: null,
      ...(user.role === Role.EVENT_MANAGER ? { createdById: user.id } : {}),
    };
  }

  private assertCanAccessEvent(user: AuthenticatedUser, createdById: string) {
    if (user.role === Role.EVENT_MANAGER && createdById !== user.id) {
      throw new ForbiddenException('You can only access events you own');
    }
  }

  private getLatestSnapshot(snapshots: AnalyticsSnapshot[]) {
    return snapshots.at(-1);
  }

  private countUpcomingEvents(events: EventWithDashboardData[]) {
    const now = new Date();

    return events.filter((event) => {
      return (
        event.startTime >= now &&
        event.status !== EventStatus.CANCELLED &&
        event.status !== EventStatus.COMPLETED
      );
    }).length;
  }

  private buildRegistrationTrend(events: EventWithDashboardData[]) {
    const trendByDate = new Map<
      string,
      {
        date: string;
        registrations: number;
        attendees: number;
        peakConcurrentViewers: number;
        engagementScoreTotal: number;
        snapshotCount: number;
      }
    >();

    for (const event of events) {
      for (const snapshot of event.analyticsSnapshots) {
        const date = snapshot.date.toISOString().slice(0, 10);
        const current = trendByDate.get(date) ?? {
          date,
          registrations: 0,
          attendees: 0,
          peakConcurrentViewers: 0,
          engagementScoreTotal: 0,
          snapshotCount: 0,
        };

        current.registrations += snapshot.registrations;
        current.attendees += snapshot.attendees;
        current.peakConcurrentViewers += this.estimatePeakConcurrentViewers(
          snapshot,
          current.snapshotCount,
        );
        current.engagementScoreTotal += snapshot.engagementScore;
        current.snapshotCount += 1;
        trendByDate.set(date, current);
      }
    }

    return Array.from(trendByDate.values())
      .sort((first, second) => first.date.localeCompare(second.date))
      .map((item) => ({
        date: item.date,
        registrations: item.registrations,
        attendees: item.attendees,
        peakConcurrentViewers: item.peakConcurrentViewers,
        averageEngagementScore: this.getAverageFromTotal(
          item.engagementScoreTotal,
          item.snapshotCount,
        ),
      }));
  }

  private buildTopEventsByAttendance(events: EventWithDashboardData[]) {
    return events
      .map((event) => {
        const latestSnapshot = this.getLatestSnapshot(event.analyticsSnapshots);

        return {
          id: event.id,
          title: event.title,
          status: event.status,
          registrations:
            latestSnapshot?.registrations ?? event._count.registrations,
          attendees: latestSnapshot?.attendees ?? 0,
          attendanceRate: this.getPercentage(
            latestSnapshot?.attendees ?? 0,
            latestSnapshot?.registrations ?? event._count.registrations,
          ),
          engagementScore: latestSnapshot?.engagementScore ?? 0,
        };
      })
      .sort((first, second) => second.attendees - first.attendees)
      .slice(0, 5);
  }

  private buildEventReadiness(events: EventWithDashboardData[]) {
    return events
      .map((event) => ({
        id: event.id,
        title: event.title,
        status: event.status,
        startTime: event.startTime,
        readinessScore: this.calculateReadinessScore(event),
        registrations:
          this.getLatestSnapshot(event.analyticsSnapshots)?.registrations ??
          event._count.registrations,
        registrationTarget: event.registrationTarget,
      }))
      .sort((first, second) => first.readinessScore - second.readinessScore);
  }

  private buildAudienceDomains(registrations: { email: string }[]) {
    const domainCounts = new Map<string, number>();

    for (const registration of registrations) {
      const domain = this.extractRegistrationDomain(registration.email);

      if (!domain) {
        continue;
      }

      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }

    return Array.from(domainCounts.entries())
      .map(([domain, count]) => ({
        domain,
        count,
      }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 5);
  }

  private buildDeviceBreakdown(registrations: AudienceRegistration[]) {
    const deviceCounts = new Map([
      ['Desktop', 0],
      ['Mobile', 0],
      ['Tablet', 0],
    ]);

    registrations.forEach((registration, index) => {
      const domain = this.extractRegistrationDomain(registration.email);
      const segment = index % 10;
      const device =
        domain === 'gmail.com' || domain === 'outlook.com'
          ? 'Mobile'
          : segment < 6
            ? 'Desktop'
            : segment < 9
              ? 'Mobile'
              : 'Tablet';

      deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);
    });

    return this.buildBreakdownItems(deviceCounts);
  }

  private buildWatchSourceBreakdown(registrations: AudienceRegistration[]) {
    const sourceCounts = new Map<string, number>();

    for (const registration of registrations) {
      const source = registration.source?.trim() || 'Direct';
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    }

    return this.buildBreakdownItems(sourceCounts, 5);
  }

  private buildGeographyBreakdown(registrations: AudienceRegistration[]) {
    const geographyCounts = new Map<string, number>();

    registrations.forEach((registration, index) => {
      const domain = this.extractRegistrationDomain(registration.email);
      const location =
        domain?.endsWith('.co.uk') || domain?.includes('company')
          ? 'United Kingdom'
          : index % 10 < 4
            ? 'United Kingdom'
            : index % 10 < 6
              ? 'United States'
              : index % 10 < 8
                ? 'Germany'
                : index % 10 === 8
                  ? 'Netherlands'
                  : 'France';

      geographyCounts.set(location, (geographyCounts.get(location) ?? 0) + 1);
    });

    return this.buildBreakdownItems(geographyCounts, 5);
  }

  private buildWorkspaceDropOffTrend(snapshots: AnalyticsSnapshot[]) {
    if (snapshots.length === 0) {
      return [];
    }

    const signal = {
      attendees: snapshots.reduce(
        (total, snapshot) => total + snapshot.attendees,
        0,
      ),
      averageWatchTime: this.getAverage(
        snapshots.map((snapshot) => snapshot.averageWatchTime),
      ),
      engagementScore: this.getAverage(
        snapshots.map((snapshot) => snapshot.engagementScore),
      ),
      pollParticipationRate: this.getAverage(
        snapshots.map((snapshot) => snapshot.pollParticipationRate),
      ),
    };

    return this.buildDropOffTrend(signal);
  }

  private buildDropOffTrend(snapshot: SnapshotSignal | null) {
    if (!snapshot || snapshot.attendees <= 0) {
      return [];
    }

    const peakViewers = this.estimatePeakConcurrentViewers(snapshot);
    const retentionLift = Math.max(0, snapshot.engagementScore - 50);
    const baseDrop = Math.max(
      6,
      Math.round((100 - snapshot.engagementScore) / 4),
    );
    const watchTimeLift = Math.min(
      12,
      Math.round(snapshot.averageWatchTime / 8),
    );
    const segments = [
      {
        segment: 'Opening',
        retention: 1,
      },
      {
        segment: 'Main session',
        retention: 0.88 + retentionLift / 500,
      },
      {
        segment: 'Interactive section',
        retention: 0.74 + retentionLift / 450 + watchTimeLift / 300,
      },
      {
        segment: 'Closing',
        retention: 0.62 + retentionLift / 420 + watchTimeLift / 260,
      },
    ];

    return segments.map((segment, index) => {
      const viewers =
        index === 0
          ? peakViewers
          : Math.max(
              0,
              Math.round(
                peakViewers * Math.min(segment.retention, 0.96) - baseDrop,
              ),
            );

      return {
        segment: segment.segment,
        viewers,
        dropOffRate: this.getPercentage(peakViewers - viewers, peakViewers),
      };
    });
  }

  private getPeakConcurrentViewers(snapshots: SnapshotSignal[]) {
    if (snapshots.length === 0) {
      return 0;
    }

    return Math.max(
      ...snapshots.map((snapshot, index) =>
        this.estimatePeakConcurrentViewers(snapshot, index),
      ),
    );
  }

  private estimatePeakConcurrentViewers(snapshot: SnapshotSignal, index = 0) {
    if (snapshot.attendees <= 0) {
      return 0;
    }

    const engagementFactor =
      0.54 + Math.min(snapshot.engagementScore, 100) / 420;
    const pollFactor = Math.min(snapshot.pollParticipationRate, 100) / 1200;
    const trendLift = Math.min(index, 5) * 0.015;

    return Math.round(
      snapshot.attendees * (engagementFactor + pollFactor + trendLift),
    );
  }

  private buildBreakdownItems(
    counts: Map<string, number>,
    limit = counts.size,
  ) {
    const total = Array.from(counts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );

    if (total === 0) {
      return [];
    }

    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([label, count]) => ({
        label,
        count,
        percentage: this.getPercentage(count, total),
      }))
      .sort((first, second) => second.count - first.count)
      .slice(0, limit);
  }

  private extractRegistrationDomain(email: string) {
    return email.split('@')[1]?.toLowerCase();
  }

  private calculateReadinessScore(event: EventWithDashboardData) {
    const scoreParts = [
      event.title && event.description ? 10 : 0,
      event.startTime && event.endTime ? 10 : 0,
      event.accessRules.length > 0 ? 20 : 0,
      event.contentModules.length > 0 ? 15 : 0,
      event.contentModules.some((module) => module.type === 'SPEAKER') ? 10 : 0,
      event.polls.length > 0 ? 10 : 0,
      event.registrationTarget > 0 ? 10 : 0,
      this.isLaunchReady(event) ? 15 : 0,
    ];

    return scoreParts.reduce((total, score) => total + score, 0);
  }

  private isLaunchReady(event: EventWithDashboardData) {
    const now = new Date();
    const daysUntilStart =
      (event.startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    return (
      daysUntilStart <= 7 &&
      event.accessRules.length > 0 &&
      event.contentModules.length > 0
    );
  }

  private getPercentage(value: number, total: number) {
    if (total <= 0) {
      return 0;
    }

    return Math.round((value / total) * 100);
  }

  private getAverage(values: number[]) {
    if (values.length === 0) {
      return 0;
    }

    return this.getAverageFromTotal(
      values.reduce((total, value) => total + value, 0),
      values.length,
    );
  }

  private getAverageFromTotal(total: number, count: number) {
    if (count <= 0) {
      return 0;
    }

    return Math.round(total / count);
  }
}
