import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser) {
    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId: user.workspaceId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                createdEvents: true,
                auditLogs: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          role: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    return members.map((member) => this.toUserListItem(member));
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const member = await this.findWorkspaceMember(user.workspaceId, id);

    return this.toUserListItem(member);
  }

  async updateRole(
    user: AuthenticatedUser,
    id: string,
    updateUserRoleDto: UpdateUserRoleDto,
  ) {
    const member = await this.findWorkspaceMember(user.workspaceId, id);

    if (member.role === updateUserRoleDto.role) {
      return this.toUserListItem(member);
    }

    await this.assertAdminRoleCanChange(
      user,
      member.userId,
      updateUserRoleDto.role,
    );

    const updatedMember = await this.prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: user.workspaceId,
          userId: id,
        },
      },
      data: {
        role: updateUserRoleDto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                createdEvents: true,
                auditLogs: true,
              },
            },
          },
        },
      },
    });

    await this.createAuditLog(user, 'USER_ROLE_UPDATED', 'User', id, {
      userId: id,
      userName: updatedMember.user.name,
      previousRole: member.role,
      newRole: updatedMember.role,
    });

    return this.toUserListItem(updatedMember);
  }

  private async findWorkspaceMember(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                createdEvents: true,
                auditLogs: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('User not found in this workspace');
    }

    return member;
  }

  private async assertAdminRoleCanChange(
    currentUser: AuthenticatedUser,
    targetUserId: string,
    newRole: Role,
  ) {
    if (currentUser.id === targetUserId && newRole !== Role.ADMIN) {
      throw new BadRequestException('You cannot remove your own Admin role');
    }

    if (newRole === Role.ADMIN) {
      return;
    }

    const adminCount = await this.prisma.workspaceMember.count({
      where: {
        workspaceId: currentUser.workspaceId,
        role: Role.ADMIN,
      },
    });

    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: currentUser.workspaceId,
          userId: targetUserId,
        },
      },
      select: {
        role: true,
      },
    });

    if (targetMember?.role === Role.ADMIN && adminCount <= 1) {
      throw new BadRequestException('At least one Admin must remain');
    }
  }

  private toUserListItem(
    member: Prisma.WorkspaceMemberGetPayload<{
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
            createdAt: true;
            updatedAt: true;
            _count: {
              select: {
                createdEvents: true;
                auditLogs: true;
              };
            };
          };
        };
      };
    }>,
  ) {
    return {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      workspaceMemberId: member.id,
      joinedAt: member.createdAt,
      createdAt: member.user.createdAt,
      updatedAt: member.user.updatedAt,
      counts: {
        createdEvents: member.user._count.createdEvents,
        auditLogs: member.user._count.auditLogs,
      },
    };
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
