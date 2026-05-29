import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentModuleDto } from './dto/create-content-module.dto';
import { ReorderContentModulesDto } from './dto/reorder-content-modules.dto';
import { UpdateContentModuleDto } from './dto/update-content-module.dto';

@Injectable()
export class ContentModulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, eventId: string) {
    await this.findEventForRead(user, eventId);

    return this.prisma.contentModule.findMany({
      where: {
        eventId,
      },
      orderBy: [
        {
          order: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });
  }

  async create(
    user: AuthenticatedUser,
    eventId: string,
    createContentModuleDto: CreateContentModuleDto,
  ) {
    const event = await this.findEventForMutation(user, eventId);
    const order =
      createContentModuleDto.order ?? (await this.getNextModuleOrder(event.id));

    const contentModule = await this.prisma.contentModule.create({
      data: {
        eventId: event.id,
        type: createContentModuleDto.type,
        title: createContentModuleDto.title,
        content: createContentModuleDto.content,
        metadata: this.toJsonInput(createContentModuleDto.metadata),
        order,
        isVisible: createContentModuleDto.isVisible ?? true,
      },
    });

    await this.createAuditLog(
      user,
      'CONTENT_MODULE_CREATED',
      'ContentModule',
      contentModule.id,
      {
        eventId: event.id,
        eventTitle: event.title,
        type: contentModule.type,
        title: contentModule.title,
      },
    );

    return contentModule;
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    updateContentModuleDto: UpdateContentModuleDto,
  ) {
    const existingContentModule = await this.findContentModuleForMutation(
      user,
      id,
    );

    const contentModule = await this.prisma.contentModule.update({
      where: {
        id: existingContentModule.id,
      },
      data: {
        type: updateContentModuleDto.type,
        title: updateContentModuleDto.title,
        content: updateContentModuleDto.content,
        metadata:
          updateContentModuleDto.metadata === undefined
            ? undefined
            : this.toJsonInput(updateContentModuleDto.metadata),
        order: updateContentModuleDto.order,
        isVisible: updateContentModuleDto.isVisible,
      },
    });

    await this.createAuditLog(
      user,
      'CONTENT_MODULE_UPDATED',
      'ContentModule',
      contentModule.id,
      {
        eventId: existingContentModule.event.id,
        eventTitle: existingContentModule.event.title,
        type: contentModule.type,
        title: contentModule.title,
      },
    );

    return contentModule;
  }

  async delete(user: AuthenticatedUser, id: string) {
    const existingContentModule = await this.findContentModuleForMutation(
      user,
      id,
    );

    await this.prisma.contentModule.delete({
      where: {
        id: existingContentModule.id,
      },
    });

    await this.createAuditLog(
      user,
      'CONTENT_MODULE_DELETED',
      'ContentModule',
      existingContentModule.id,
      {
        eventId: existingContentModule.event.id,
        eventTitle: existingContentModule.event.title,
        type: existingContentModule.type,
        title: existingContentModule.title,
      },
    );

    return {
      id: existingContentModule.id,
      deleted: true,
    };
  }

  async reorder(
    user: AuthenticatedUser,
    eventId: string,
    reorderContentModulesDto: ReorderContentModulesDto,
  ) {
    const event = await this.findEventForMutation(user, eventId);
    const uniqueIds = new Set(
      reorderContentModulesDto.items.map((item) => item.id),
    );

    if (uniqueIds.size !== reorderContentModulesDto.items.length) {
      throw new BadRequestException('Content module ids must be unique');
    }

    const contentModules = await this.prisma.contentModule.findMany({
      where: {
        eventId: event.id,
        id: {
          in: Array.from(uniqueIds),
        },
      },
      select: {
        id: true,
      },
    });

    if (contentModules.length !== uniqueIds.size) {
      throw new BadRequestException(
        'All reordered content modules must belong to this event',
      );
    }

    const updatedContentModules = await this.prisma.$transaction(
      reorderContentModulesDto.items.map((item) =>
        this.prisma.contentModule.update({
          where: {
            id: item.id,
          },
          data: {
            order: item.order,
          },
        }),
      ),
    );

    await this.createAuditLog(
      user,
      'CONTENT_MODULES_REORDERED',
      'Event',
      event.id,
      this.toJsonInput({
        eventTitle: event.title,
        items: reorderContentModulesDto.items.map((item) => ({
          id: item.id,
          order: item.order,
        })),
      }),
    );

    return updatedContentModules.sort(
      (first, second) => first.order - second.order,
    );
  }

  private async findEventForRead(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
        archivedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertCanAccessEvent(user, event.createdById);

    return event;
  }

  private async findEventForMutation(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
        archivedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertCanMutateEvent(user, event.createdById);

    return event;
  }

  private async findContentModuleForMutation(
    user: AuthenticatedUser,
    id: string,
  ) {
    const contentModule = await this.prisma.contentModule.findFirst({
      where: {
        id,
        event: {
          workspaceId: user.workspaceId,
          archivedAt: null,
        },
      },
      include: {
        event: true,
      },
    });

    if (!contentModule) {
      throw new NotFoundException('Content module not found');
    }

    this.assertCanMutateEvent(user, contentModule.event.createdById);

    return contentModule;
  }

  private async getNextModuleOrder(eventId: string) {
    const lastContentModule = await this.prisma.contentModule.findFirst({
      where: {
        eventId,
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    });

    return (lastContentModule?.order ?? -1) + 1;
  }

  private assertCanAccessEvent(user: AuthenticatedUser, createdById: string) {
    if (user.role === Role.EVENT_MANAGER && createdById !== user.id) {
      throw new ForbiddenException('You can only access events you own');
    }
  }

  private assertCanMutateEvent(user: AuthenticatedUser, createdById: string) {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (user.role === Role.EVENT_MANAGER && createdById === user.id) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to modify this event',
    );
  }

  private toJsonInput(value?: Record<string, unknown>) {
    return value as Prisma.InputJsonValue | undefined;
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
