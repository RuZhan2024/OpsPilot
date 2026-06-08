import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from './workspaces.service';

type MockPrismaService = {
  workspace: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
};

type WorkspaceUpdateCall = {
  where: {
    id: string;
  };
  data: {
    name: string;
  };
};

type AuditLogCreateCall = {
  data: {
    action: string;
    entityType: string;
    entityId: string;
    metadata?: {
      previousName?: string;
      newName?: string;
    };
  };
};

const now = new Date('2026-06-08T09:00:00.000Z');

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  name: 'Alice Morgan',
  email: 'admin@opspilot.dev',
  workspaceId: 'workspace-1',
  role: Role.ADMIN,
};

function createWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    id: 'workspace-1',
    name: 'OpsPilot Demo Workspace',
    slug: 'opspilot-demo',
    createdAt: now,
    updatedAt: now,
    _count: {
      members: 4,
      events: 8,
      audienceGroups: 4,
      auditLogs: 30,
    },
    ...overrides,
  };
}

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = {
      workspace: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    service = new WorkspacesService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current workspace settings summary', async () => {
    prisma.workspace.findUnique.mockResolvedValue(createWorkspace());

    const result = await service.findCurrent(adminUser);

    expect(result).toEqual({
      id: 'workspace-1',
      name: 'OpsPilot Demo Workspace',
      slug: 'opspilot-demo',
      createdAt: now,
      updatedAt: now,
      counts: {
        members: 4,
        events: 8,
        audienceGroups: 4,
        auditLogs: 30,
      },
    });
  });

  it('updates the workspace name and records an audit log', async () => {
    prisma.workspace.findUnique.mockResolvedValue(createWorkspace());
    prisma.workspace.update.mockResolvedValue(
      createWorkspace({
        name: 'OpsPilot Portfolio Workspace',
      }),
    );

    const result = await service.updateCurrent(adminUser, {
      name: ' OpsPilot Portfolio Workspace ',
    });

    expect(result.name).toBe('OpsPilot Portfolio Workspace');
    expect(getWorkspaceUpdateCall(prisma).where.id).toBe('workspace-1');
    expect(getWorkspaceUpdateCall(prisma).data.name).toBe(
      'OpsPilot Portfolio Workspace',
    );
    expect(getAuditLogCreateCall(prisma).data).toEqual({
      workspaceId: 'workspace-1',
      actorUserId: 'admin-1',
      action: 'WORKSPACE_UPDATED',
      entityType: 'Workspace',
      entityId: 'workspace-1',
      metadata: {
        previousName: 'OpsPilot Demo Workspace',
        newName: 'OpsPilot Portfolio Workspace',
      },
    });
  });

  it('returns current settings without writing when the name is unchanged', async () => {
    prisma.workspace.findUnique.mockResolvedValue(createWorkspace());

    const result = await service.updateCurrent(adminUser, {
      name: 'OpsPilot Demo Workspace',
    });

    expect(result.name).toBe('OpsPilot Demo Workspace');
    expect(prisma.workspace.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('throws when the workspace cannot be found', async () => {
    prisma.workspace.findUnique.mockResolvedValue(null);

    await expect(service.findCurrent(adminUser)).rejects.toThrow(
      NotFoundException,
    );
  });
});

function getWorkspaceUpdateCall(prisma: MockPrismaService) {
  const calls = prisma.workspace.update.mock.calls as Array<
    [WorkspaceUpdateCall]
  >;

  return calls[0][0];
}

function getAuditLogCreateCall(prisma: MockPrismaService) {
  const calls = prisma.auditLog.create.mock.calls as Array<
    [AuditLogCreateCall]
  >;

  return calls[0][0];
}
