import { ForbiddenException } from '@nestjs/common';
import {
  ContentModuleType,
  EventStatus,
  EventType,
  Role,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from './events.service';

type MockPrismaService = {
  event: {
    findFirst: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
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

const managerUser: AuthenticatedUser = {
  id: 'manager-1',
  name: 'Ben Carter',
  email: 'manager@opspilot.dev',
  workspaceId: 'workspace-1',
  role: Role.EVENT_MANAGER,
};

function createReadinessEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    workspaceId: 'workspace-1',
    createdById: 'manager-1',
    title: 'Q2 Product Launch Webinar',
    description: 'Launch event for the new enterprise product suite.',
    eventType: EventType.PRODUCT_LAUNCH,
    status: EventStatus.SCHEDULED,
    startTime: new Date('2026-06-05T10:00:00.000Z'),
    endTime: new Date('2026-06-05T12:00:00.000Z'),
    timezone: 'Europe/London',
    coverImageUrl: null,
    registrationTarget: 300,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    accessRules: [{ id: 'access-rule-1' }],
    contentModules: [
      { id: 'module-1', type: ContentModuleType.AGENDA },
      { id: 'module-2', type: ContentModuleType.SPEAKER },
    ],
    polls: [{ id: 'poll-1' }],
    ...overrides,
  };
}

describe('EventsService', () => {
  let service: EventsService;
  let prisma: MockPrismaService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prisma = {
      event: {
        findFirst: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    service = new EventsService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('calculates a ready score when the event setup is complete', async () => {
    prisma.event.findFirst.mockResolvedValue(createReadinessEvent());

    const result = await service.getReadiness(adminUser, 'event-1');

    expect(result).toMatchObject({
      eventId: 'event-1',
      score: 100,
      status: 'READY',
    });
    expect(result.checklist).toHaveLength(8);
    expect(result.checklist.every((item) => item.completed)).toBe(true);
  });

  it('marks incomplete operational setup as at risk', async () => {
    prisma.event.findFirst.mockResolvedValue(
      createReadinessEvent({
        description: null,
        startTime: new Date('2026-06-20T10:00:00.000Z'),
        endTime: new Date('2026-06-20T12:00:00.000Z'),
        registrationTarget: 0,
        accessRules: [],
        contentModules: [],
        polls: [],
      }),
    );

    const result = await service.getReadiness(adminUser, 'event-1');

    expect(result).toMatchObject({
      eventId: 'event-1',
      score: 10,
      status: 'AT_RISK',
    });
    expect(
      result.checklist.find((item) => item.key === 'access-rule')?.completed,
    ).toBe(false);
    expect(
      result.checklist.find((item) => item.key === 'content')?.completed,
    ).toBe(false);
  });

  it('prevents event managers from reading another manager event readiness', async () => {
    prisma.event.findFirst.mockResolvedValue(
      createReadinessEvent({
        createdById: 'other-manager',
      }),
    );

    await expect(service.getReadiness(managerUser, 'event-1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
