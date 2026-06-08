import { ForbiddenException } from '@nestjs/common';
import { EventStatus, Role, StreamStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { StreamSettingsService } from './stream-settings.service';

type MockPrismaService = {
  event: {
    findFirst: jest.Mock;
  };
  streamSetting: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
};

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

function createEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    workspaceId: 'workspace-1',
    createdById: 'manager-1',
    title: 'Q2 Product Launch Webinar',
    status: EventStatus.SCHEDULED,
    archivedAt: null,
    ...overrides,
  };
}

function createStreamSetting(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stream-1',
    eventId: 'event-1',
    ingestServerUrl: 'rtmp://live.opspilot.dev/live',
    streamKey: 'op_event_123',
    streamStatus: StreamStatus.READY,
    recordingEnabled: true,
    lowLatencyMode: false,
    speakerTestCompleted: false,
    networkCheckCompleted: false,
    backupStreamEnabled: false,
    viewerUrl: 'http://localhost:3000/watch/event-1',
    mobileViewerUrl: 'http://localhost:3000/watch/event-1?view=mobile',
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('StreamSettingsService', () => {
  let service: StreamSettingsService;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = {
      event: {
        findFirst: jest.fn(),
      },
      streamSetting: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    service = new StreamSettingsService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates default stream settings for an event without existing settings', async () => {
    prisma.event.findFirst.mockResolvedValue(createEvent());
    prisma.streamSetting.findUnique.mockResolvedValue(null);
    prisma.streamSetting.create.mockResolvedValue(createStreamSetting());

    const result = await service.findForEvent(adminUser, 'event-1');

    expect(result).toMatchObject({
      eventId: 'event-1',
      streamStatus: StreamStatus.READY,
      recordingEnabled: true,
    });
    const createCalls = prisma.streamSetting.create.mock
      .calls as unknown as Array<
      [{ data: { eventId: string; ingestServerUrl: string } }]
    >;
    const createArgs = createCalls[0]?.[0];

    expect(createArgs?.data.eventId).toBe('event-1');
    expect(createArgs?.data.ingestServerUrl).toBe(
      'rtmp://live.opspilot.dev/live',
    );
  });

  it('updates stream settings and records an audit log', async () => {
    prisma.event.findFirst.mockResolvedValue(createEvent());
    prisma.streamSetting.findUnique.mockResolvedValue(createStreamSetting());
    prisma.streamSetting.update.mockResolvedValue(
      createStreamSetting({
        streamStatus: StreamStatus.RECEIVING_SIGNAL,
        networkCheckCompleted: true,
      }),
    );
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.updateForEvent(adminUser, 'event-1', {
      streamStatus: StreamStatus.RECEIVING_SIGNAL,
      networkCheckCompleted: true,
    });

    expect(result).toMatchObject({
      streamStatus: StreamStatus.RECEIVING_SIGNAL,
      networkCheckCompleted: true,
    });
    const auditCalls = prisma.auditLog.create.mock.calls as unknown as Array<
      [{ data: { action: string; entityType: string; entityId: string } }]
    >;
    const auditArgs = auditCalls[0]?.[0];

    expect(auditArgs?.data.action).toBe('STREAM_SETTINGS_UPDATED');
    expect(auditArgs?.data.entityType).toBe('StreamSetting');
    expect(auditArgs?.data.entityId).toBe('stream-1');
  });

  it('prevents event managers from changing another manager event stream setup', async () => {
    prisma.event.findFirst.mockResolvedValue(
      createEvent({
        createdById: 'other-manager',
      }),
    );

    await expect(
      service.updateForEvent(managerUser, 'event-1', {
        streamStatus: StreamStatus.READY,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.streamSetting.update).not.toHaveBeenCalled();
  });
});
