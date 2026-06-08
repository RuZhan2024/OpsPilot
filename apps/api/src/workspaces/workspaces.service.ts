import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

type WorkspaceSettings = Prisma.WorkspaceGetPayload<{
  include: {
    _count: {
      select: {
        members: true;
        events: true;
        audienceGroups: true;
        auditLogs: true;
      };
    };
  };
}>;

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrent(user: AuthenticatedUser) {
    const workspace = await this.findWorkspace(user.workspaceId);

    return this.toWorkspaceSettings(workspace);
  }

  async updateCurrent(
    user: AuthenticatedUser,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    const existingWorkspace = await this.findWorkspace(user.workspaceId);
    const nextName = updateWorkspaceDto.name.trim();

    if (existingWorkspace.name === nextName) {
      return this.toWorkspaceSettings(existingWorkspace);
    }

    const workspace = await this.prisma.workspace.update({
      where: {
        id: user.workspaceId,
      },
      data: {
        name: nextName,
      },
      include: this.workspaceSettingsInclude,
    });

    await this.createAuditLog(
      user,
      'WORKSPACE_UPDATED',
      'Workspace',
      user.workspaceId,
      {
        previousName: existingWorkspace.name,
        newName: workspace.name,
      },
    );

    return this.toWorkspaceSettings(workspace);
  }

  private async findWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      include: this.workspaceSettingsInclude,
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  private get workspaceSettingsInclude() {
    return {
      _count: {
        select: {
          members: true,
          events: true,
          audienceGroups: true,
          auditLogs: true,
        },
      },
    } satisfies Prisma.WorkspaceInclude;
  }

  private toWorkspaceSettings(workspace: WorkspaceSettings) {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      counts: {
        members: workspace._count.members,
        events: workspace._count.events,
        audienceGroups: workspace._count.audienceGroups,
        auditLogs: workspace._count.auditLogs,
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
