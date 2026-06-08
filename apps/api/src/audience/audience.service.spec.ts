import { ForbiddenException } from '@nestjs/common';
import { EventStatus, RegistrationStatus, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { AudienceService } from './audience.service';

type MockPrismaService = {
  event: {
    findFirst: jest.Mock;
  };
  invitation: {
    findMany: jest.Mock;
    createMany: jest.Mock;
  };
  registration: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
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

function createRegistration(overrides: Record<string, unknown> = {}) {
  return {
    id: 'registration-1',
    eventId: 'event-1',
    name: 'Attendee One',
    email: 'attendee@example.com',
    status: RegistrationStatus.PENDING,
    source: 'Landing page',
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    event: createEvent(),
    ...overrides,
  };
}

describe('AudienceService', () => {
  let service: AudienceService;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = {
      event: {
        findFirst: jest.fn(),
      },
      invitation: {
        findMany: jest.fn(),
        createMany: jest.fn(),
      },
      registration: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    service = new AudienceService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('imports unique invitations and skips existing records', async () => {
    prisma.event.findFirst.mockResolvedValue(createEvent());
    prisma.invitation.findMany.mockResolvedValue([
      { email: 'existing-invite@example.com' },
    ]);
    prisma.registration.findMany.mockResolvedValue([
      { email: 'registered@example.com' },
    ]);
    prisma.invitation.createMany.mockResolvedValue({ count: 2 });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.bulkCreateInvitations(adminUser, 'event-1', {
      emails: [
        'New.One@example.com',
        'new.two@example.com',
        'existing-invite@example.com',
        'registered@example.com',
        'new.one@example.com',
      ],
    });

    expect(result).toEqual({
      eventId: 'event-1',
      importedCount: 2,
      skippedExistingInvitations: ['existing-invite@example.com'],
      skippedExistingRegistrations: ['registered@example.com'],
      importedEmails: ['new.one@example.com', 'new.two@example.com'],
    });
    expect(prisma.invitation.createMany).toHaveBeenCalledWith({
      data: [
        {
          eventId: 'event-1',
          email: 'new.one@example.com',
        },
        {
          eventId: 'event-1',
          email: 'new.two@example.com',
        },
      ],
    });
  });

  it('approves a pending registration and records an audit log', async () => {
    prisma.registration.findFirst.mockResolvedValue(createRegistration());
    prisma.registration.update.mockResolvedValue(
      createRegistration({
        status: RegistrationStatus.APPROVED,
      }),
    );
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.updateRegistrationStatus(
      adminUser,
      'registration-1',
      RegistrationStatus.APPROVED,
    );

    expect(result.status).toBe(RegistrationStatus.APPROVED);
    expect(prisma.registration.update).toHaveBeenCalledWith({
      where: {
        id: 'registration-1',
      },
      data: {
        status: RegistrationStatus.APPROVED,
      },
    });
    const auditCalls = prisma.auditLog.create.mock.calls as unknown as Array<
      [{ data: { action: string; entityType: string; entityId: string } }]
    >;

    expect(auditCalls[0]?.[0].data.action).toBe('REGISTRATION_APPROVED');
    expect(auditCalls[0]?.[0].data.entityType).toBe('Registration');
    expect(auditCalls[0]?.[0].data.entityId).toBe('registration-1');
  });

  it('prevents event managers from approving another manager event registration', async () => {
    prisma.registration.findFirst.mockResolvedValue(
      createRegistration({
        event: createEvent({
          createdById: 'other-manager',
        }),
      }),
    );

    await expect(
      service.updateRegistrationStatus(
        managerUser,
        'registration-1',
        RegistrationStatus.APPROVED,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.registration.update).not.toHaveBeenCalled();
  });
});
