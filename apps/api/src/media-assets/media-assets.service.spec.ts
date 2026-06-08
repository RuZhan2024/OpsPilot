import { ForbiddenException } from '@nestjs/common';
import {
  EventStatus,
  MediaAssetSource,
  MediaAssetStatus,
  MediaAssetType,
  Prisma,
  Role,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { MediaAssetsService } from './media-assets.service';

type MockPrismaService = {
  $transaction: jest.Mock;
  mediaAsset: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  event: {
    findFirst: jest.Mock;
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
    startTime: new Date('2026-06-10T10:00:00.000Z'),
    archivedAt: null,
    ...overrides,
  };
}

function createMediaAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 'media-1',
    workspaceId: 'workspace-1',
    eventId: null,
    createdById: 'manager-1',
    title: 'Launch Replay',
    description: 'Edited replay package.',
    assetType: MediaAssetType.REPLAY,
    source: MediaAssetSource.LIVE_RECORDING,
    status: MediaAssetStatus.READY,
    durationSeconds: 3600,
    sizeBytes: 120_000_000,
    thumbnailUrl: null,
    playbackUrl: 'https://example.com/replay',
    event: null,
    createdBy: {
      id: 'manager-1',
      name: 'Ben Carter',
      email: 'manager@opspilot.dev',
    },
    markers: [],
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('MediaAssetsService', () => {
  let service: MediaAssetsService;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
      mediaAsset: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      event: {
        findFirst: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    service = new MediaAssetsService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a paginated media library response', async () => {
    prisma.mediaAsset.findMany.mockResolvedValue([createMediaAsset()]);
    prisma.mediaAsset.count.mockResolvedValue(12);

    const result = await service.findAll(adminUser, {
      page: '2',
      pageSize: '5',
      search: 'launch',
    });

    expect(result.meta).toEqual({
      page: 2,
      pageSize: 5,
      total: 12,
      totalPages: 3,
    });
    expect(result.items).toHaveLength(1);

    const findManyCalls = prisma.mediaAsset.findMany.mock
      .calls as unknown as Array<[Prisma.MediaAssetFindManyArgs]>;

    expect(findManyCalls[0]?.[0].skip).toBe(5);
    expect(findManyCalls[0]?.[0].take).toBe(5);
  });

  it('attaches a media asset to an event and records an audit log', async () => {
    prisma.event.findFirst.mockResolvedValue(createEvent());
    prisma.mediaAsset.findFirst.mockResolvedValue(createMediaAsset());
    prisma.mediaAsset.update.mockResolvedValue(
      createMediaAsset({
        eventId: 'event-1',
        event: createEvent(),
      }),
    );
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.attachToEvent(
      managerUser,
      'event-1',
      'media-1',
    );

    expect(result.eventId).toBe('event-1');

    const updateCalls = prisma.mediaAsset.update.mock.calls as unknown as Array<
      [Prisma.MediaAssetUpdateArgs]
    >;
    const auditCalls = prisma.auditLog.create.mock.calls as unknown as Array<
      [Prisma.AuditLogCreateArgs]
    >;

    expect(updateCalls[0]?.[0].data).toMatchObject({ eventId: 'event-1' });
    expect(auditCalls[0]?.[0].data.action).toBe('MEDIA_ASSET_ATTACHED');
  });

  it('prevents event managers from attaching media assets they do not own', async () => {
    prisma.event.findFirst.mockResolvedValue(createEvent());
    prisma.mediaAsset.findFirst.mockResolvedValue(
      createMediaAsset({
        createdById: 'other-manager',
        event: createEvent({
          createdById: 'other-manager',
        }),
      }),
    );

    await expect(
      service.attachToEvent(managerUser, 'event-1', 'media-1'),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.mediaAsset.update).not.toHaveBeenCalled();
  });
});
