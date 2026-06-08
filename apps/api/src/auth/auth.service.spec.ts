import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

type MockPrismaService = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  workspace: {
    findUnique: jest.Mock;
  };
};

type MockJwtService = {
  signAsync: jest.Mock;
};

type UserCreateCall = {
  data: {
    name: string;
    email: string;
    memberships: {
      create: {
        role: Role;
        workspace: {
          create: {
            name: string;
            slug: string;
          };
        };
      };
    };
  };
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: MockPrismaService;
  let jwtService: MockJwtService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      workspace: {
        findUnique: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates an admin user and workspace during registration', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.workspace.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Ruth Admin',
      email: 'ruth@example.com',
      memberships: [
        {
          workspaceId: 'workspace-1',
          role: Role.ADMIN,
          workspace: {
            id: 'workspace-1',
            name: 'Ruth Events',
            slug: 'ruth-events',
          },
        },
      ],
    });

    const result = await service.register({
      name: ' Ruth Admin ',
      email: ' Ruth@Example.com ',
      password: 'password123',
      workspaceName: ' Ruth Events ',
    });

    expect(result).toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'user-1',
        name: 'Ruth Admin',
        email: 'ruth@example.com',
        workspaceId: 'workspace-1',
        role: Role.ADMIN,
      },
    });
    const createCall = getUserCreateCall(prisma);

    expect(createCall.data.name).toBe('Ruth Admin');
    expect(createCall.data.email).toBe('ruth@example.com');
    expect(createCall.data.memberships.create.role).toBe(Role.ADMIN);
    expect(createCall.data.memberships.create.workspace.create).toEqual({
      name: 'Ruth Events',
      slug: 'ruth-events',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith(result.user);
  });

  it('adds a numeric suffix when the workspace slug already exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.workspace.findUnique
      .mockResolvedValueOnce({ id: 'existing-workspace' })
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Ruth Admin',
      email: 'ruth@example.com',
      memberships: [
        {
          workspaceId: 'workspace-1',
          role: Role.ADMIN,
          workspace: {
            id: 'workspace-1',
            name: 'Ruth Events',
            slug: 'ruth-events-2',
          },
        },
      ],
    });

    await service.register({
      name: 'Ruth Admin',
      email: 'ruth@example.com',
      password: 'password123',
      workspaceName: 'Ruth Events',
    });

    expect(prisma.workspace.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        slug: 'ruth-events',
      },
      select: {
        id: true,
      },
    });
    expect(prisma.workspace.findUnique).toHaveBeenNthCalledWith(2, {
      where: {
        slug: 'ruth-events-2',
      },
      select: {
        id: true,
      },
    });
    expect(
      getUserCreateCall(prisma).data.memberships.create.workspace.create.slug,
    ).toBe('ruth-events-2');
  });

  it('rejects registration when the email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({
        name: 'Ruth Admin',
        email: 'ruth@example.com',
        password: 'password123',
        workspaceName: 'Ruth Events',
      }),
    ).rejects.toThrow(ConflictException);

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});

function getUserCreateCall(prisma: MockPrismaService) {
  const calls = prisma.user.create.mock.calls as Array<[UserCreateCall]>;

  return calls[0][0];
}
