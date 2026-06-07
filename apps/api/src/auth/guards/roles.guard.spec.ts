import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { RolesGuard } from './roles.guard';

type MockReflector = {
  getAllAndOverride: jest.Mock;
};

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  name: 'Alice Morgan',
  email: 'admin@opspilot.dev',
  workspaceId: 'workspace-1',
  role: Role.ADMIN,
};

const viewerUser: AuthenticatedUser = {
  id: 'viewer-1',
  name: 'Daniel Reed',
  email: 'viewer@opspilot.dev',
  workspaceId: 'workspace-1',
  role: Role.VIEWER,
};

function createExecutionContext(user?: AuthenticatedUser) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: MockReflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows routes without role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createExecutionContext(adminUser))).toBe(true);
  });

  it('allows users with a required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(createExecutionContext(adminUser))).toBe(true);
  });

  it('rejects requests without an authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(createExecutionContext())).toThrow(
      ForbiddenException,
    );
  });

  it('rejects users without the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(createExecutionContext(viewerUser))).toThrow(
      ForbiddenException,
    );
  });
});
