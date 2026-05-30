import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnalyticsSnapshot,
  EventStatus,
  Prisma,
  RecommendationSeverity,
  RecommendationStatus,
  RecommendationType,
  Role,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';

type EventForRecommendations = Prisma.EventGetPayload<{
  include: {
    accessRules: true;
    contentModules: true;
    polls: true;
    analyticsSnapshots: true;
    _count: {
      select: {
        registrations: true;
      };
    };
  };
}>;

type RecommendationCandidate = {
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  suggestedAction: string;
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, eventId: string) {
    await this.findEventForRead(user, eventId);

    return this.prisma.recommendation.findMany({
      where: {
        eventId,
      },
      orderBy: [
        {
          status: 'asc',
        },
        {
          severity: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async generate(user: AuthenticatedUser, eventId: string) {
    const event = await this.findEventForMutation(user, eventId);
    const candidates = this.buildCandidates(event);
    const openRecommendations = await this.prisma.recommendation.findMany({
      where: {
        eventId: event.id,
        status: RecommendationStatus.OPEN,
      },
      select: {
        type: true,
        title: true,
      },
    });

    const openRecommendationKeys = new Set(
      openRecommendations.map((recommendation) =>
        this.getRecommendationKey(recommendation.type, recommendation.title),
      ),
    );
    const newCandidates = candidates.filter((candidate) => {
      return !openRecommendationKeys.has(
        this.getRecommendationKey(candidate.type, candidate.title),
      );
    });

    const generatedRecommendations = await this.prisma.$transaction(
      newCandidates.map((candidate) =>
        this.prisma.recommendation.create({
          data: {
            eventId: event.id,
            type: candidate.type,
            severity: candidate.severity,
            title: candidate.title,
            description: candidate.description,
            suggestedAction: candidate.suggestedAction,
          },
        }),
      ),
    );

    if (generatedRecommendations.length > 0) {
      await this.createAuditLog(
        user,
        'RECOMMENDATIONS_GENERATED',
        'Event',
        event.id,
        {
          eventTitle: event.title,
          generatedCount: generatedRecommendations.length,
          recommendationIds: generatedRecommendations.map(
            (recommendation) => recommendation.id,
          ),
        },
      );
    }

    const recommendations = await this.findAll(user, event.id);

    return {
      generatedCount: generatedRecommendations.length,
      skippedCount: candidates.length - generatedRecommendations.length,
      generated: generatedRecommendations,
      recommendations,
    };
  }

  async resolve(user: AuthenticatedUser, id: string) {
    const recommendation = await this.findRecommendationForMutation(user, id);

    if (recommendation.status === RecommendationStatus.RESOLVED) {
      return recommendation;
    }

    const resolvedRecommendation = await this.prisma.recommendation.update({
      where: {
        id: recommendation.id,
      },
      data: {
        status: RecommendationStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    await this.createAuditLog(
      user,
      'RECOMMENDATION_RESOLVED',
      'Recommendation',
      resolvedRecommendation.id,
      {
        eventId: recommendation.event.id,
        eventTitle: recommendation.event.title,
        title: resolvedRecommendation.title,
        type: resolvedRecommendation.type,
      },
    );

    return resolvedRecommendation;
  }

  private buildCandidates(event: EventForRecommendations) {
    const candidates: RecommendationCandidate[] = [];
    const latestSnapshot = this.getLatestSnapshot(event.analyticsSnapshots);
    const registrationCount =
      latestSnapshot?.registrations ?? event._count.registrations;

    if (event.accessRules.length === 0) {
      candidates.push({
        type: RecommendationType.READINESS_RISK,
        severity: RecommendationSeverity.HIGH,
        title: 'Audience access rule is missing',
        description:
          'This event does not have an audience access rule, so registration and replay access may be unclear.',
        suggestedAction:
          'Configure an access rule before sharing the event with attendees.',
      });
    }

    if (event.contentModules.length === 0) {
      candidates.push({
        type: RecommendationType.CONTENT_QUALITY,
        severity: RecommendationSeverity.MEDIUM,
        title: 'Event content modules are missing',
        description:
          'The event page has no agenda, speaker, resource or announcement modules yet.',
        suggestedAction:
          'Add at least one content module so attendees understand the event structure.',
      });
    }

    if (
      this.startsWithinDays(event.startTime, 3) &&
      registrationCount < event.registrationTarget * 0.5
    ) {
      candidates.push({
        type: RecommendationType.AUDIENCE_GROWTH,
        severity: RecommendationSeverity.HIGH,
        title: 'Registration is below target',
        description: `Registration is below 50% of the target with the event starting soon. Current registrations: ${registrationCount}. Target: ${event.registrationTarget}.`,
        suggestedAction:
          'Review the promotion plan, send a reminder campaign, or adjust the target audience.',
      });
    }

    if (
      event.status === EventStatus.COMPLETED &&
      latestSnapshot &&
      latestSnapshot.engagementScore < 50
    ) {
      candidates.push({
        type: RecommendationType.POST_EVENT_IMPROVEMENT,
        severity: RecommendationSeverity.MEDIUM,
        title: 'Post-event engagement was low',
        description: `The latest engagement score is ${latestSnapshot.engagementScore}, which is below the expected threshold of 50.`,
        suggestedAction:
          'Review Q&A, poll and feedback data to identify ways to improve future sessions.',
      });
    }

    if (event.status === EventStatus.SCHEDULED && event.polls.length === 0) {
      candidates.push({
        type: RecommendationType.ENGAGEMENT_RISK,
        severity: RecommendationSeverity.LOW,
        title: 'No poll is configured',
        description:
          'Scheduled events without polls often have fewer interaction points during the live session.',
        suggestedAction:
          'Add a poll to create at least one planned engagement moment.',
      });
    }

    return candidates;
  }

  private async findEventForRead(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        ...this.getVisibleEventWhere(user),
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertCanAccessEvent(user, event.createdById);

    return event;
  }

  private async findEventForMutation(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
        archivedAt: null,
      },
      include: {
        accessRules: true,
        contentModules: true,
        polls: true,
        analyticsSnapshots: {
          orderBy: {
            date: 'asc',
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertCanMutateEvent(user, event.createdById);

    return event;
  }

  private async findRecommendationForMutation(
    user: AuthenticatedUser,
    id: string,
  ) {
    const recommendation = await this.prisma.recommendation.findFirst({
      where: {
        id,
        event: {
          workspaceId: user.workspaceId,
          archivedAt: null,
        },
      },
      include: {
        event: true,
      },
    });

    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    this.assertCanMutateEvent(user, recommendation.event.createdById);

    return recommendation;
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

  private assertCanMutateEvent(user: AuthenticatedUser, createdById: string) {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (user.role === Role.EVENT_MANAGER && createdById === user.id) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to modify this event',
    );
  }

  private getLatestSnapshot(snapshots: AnalyticsSnapshot[]) {
    return snapshots.at(-1);
  }

  private startsWithinDays(startTime: Date, days: number) {
    const now = new Date();
    const daysUntilStart =
      (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    return daysUntilStart >= 0 && daysUntilStart <= days;
  }

  private getRecommendationKey(type: RecommendationType, title: string) {
    return `${type}:${title.toLowerCase()}`;
  }

  private async createAuditLog(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorUserId: user.id,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
  }
}
