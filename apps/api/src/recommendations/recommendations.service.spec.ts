import { ForbiddenException } from '@nestjs/common';
import {
  EventStatus,
  EventType,
  RecommendationStatus,
  RecommendationType,
  Role,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationsService } from './recommendations.service';

type MockPrismaService = {
  event: {
    findFirst: jest.Mock;
  };
  recommendation: {
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
  $transaction: jest.Mock;
};

type RecommendationCreateCall = {
  data: {
    title: string;
  };
};

type AuditLogCreateCall = {
  data: {
    action: string;
    entityId: string;
    metadata?: {
      generatedCount?: number;
    };
  };
};

const now = new Date('2026-06-01T12:00:00.000Z');

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  name: 'Alice Morgan',
  email: 'admin@opspilot.dev',
  workspaceId: 'workspace-1',
  role: Role.ADMIN,
};

const analystUser: AuthenticatedUser = {
  id: 'analyst-1',
  name: 'Clara Hughes',
  email: 'analyst@opspilot.dev',
  workspaceId: 'workspace-1',
  role: Role.ANALYST,
};

function createRecommendationEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    workspaceId: 'workspace-1',
    createdById: 'manager-1',
    title: 'AI Product Roadmap Session',
    description: 'Roadmap preview for AI-assisted product capabilities.',
    eventType: EventType.WEBINAR,
    status: EventStatus.SCHEDULED,
    startTime: new Date('2026-06-03T10:00:00.000Z'),
    endTime: new Date('2026-06-03T11:00:00.000Z'),
    timezone: 'Europe/London',
    coverImageUrl: null,
    registrationTarget: 100,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    accessRules: [],
    contentModules: [],
    polls: [],
    analyticsSnapshots: [],
    _count: {
      registrations: 20,
    },
    ...overrides,
  };
}

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let prisma: MockPrismaService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prisma = {
      event: {
        findFirst: jest.fn(),
      },
      recommendation: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };

    prisma.recommendation.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: `recommendation-${prisma.recommendation.create.mock.calls.length}`,
          eventId: 'event-1',
          status: RecommendationStatus.OPEN,
          resolvedAt: null,
          createdAt: now,
          ...data,
        }),
    );

    service = new RecommendationsService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('generates operational recommendations and skips duplicate open items', async () => {
    prisma.event.findFirst
      .mockResolvedValueOnce(createRecommendationEvent())
      .mockResolvedValueOnce({
        id: 'event-1',
        workspaceId: 'workspace-1',
        createdById: 'manager-1',
        archivedAt: null,
      });
    prisma.recommendation.findMany
      .mockResolvedValueOnce([
        {
          type: RecommendationType.READINESS_RISK,
          title: 'Audience access rule is missing',
        },
      ])
      .mockResolvedValueOnce([{ id: 'existing-recommendation' }]);

    const result = await service.generate(adminUser, 'event-1');

    expect(result.generatedCount).toBe(3);
    expect(result.skippedCount).toBe(1);
    expect(prisma.recommendation.create).toHaveBeenCalledTimes(3);
    const createCalls = prisma.recommendation.create.mock.calls as Array<
      [RecommendationCreateCall]
    >;
    const auditLogCalls = prisma.auditLog.create.mock.calls as Array<
      [AuditLogCreateCall]
    >;
    const auditLogCall = auditLogCalls[0][0];

    expect(createCalls.map(([call]) => call.data.title)).toEqual([
      'Event content modules are missing',
      'Registration is below target',
      'No poll is configured',
    ]);
    expect(auditLogCall.data.action).toBe('RECOMMENDATIONS_GENERATED');
    expect(auditLogCall.data.entityId).toBe('event-1');
    expect(auditLogCall.data.metadata?.generatedCount).toBe(3);
  });

  it('prevents read-only roles from generating recommendations', async () => {
    prisma.event.findFirst.mockResolvedValue(createRecommendationEvent());

    await expect(service.generate(analystUser, 'event-1')).rejects.toThrow(
      ForbiddenException,
    );

    expect(prisma.recommendation.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
