import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser) {
    return this.prisma.event.findMany({
      where: {
        workspaceId: user.workspaceId,
        archivedAt: null,
        ...(user.role === Role.EVENT_MANAGER ? { createdById: user.id } : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        accessRules: true,
        contentModules: true,
        recommendations: {
          where: {
            status: 'OPEN',
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async create(user: AuthenticatedUser, createEventDto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        workspaceId: user.workspaceId,
        createdById: user.id,
        title: createEventDto.title,
        description: createEventDto.description,
        eventType: createEventDto.eventType,
        startTime: new Date(createEventDto.startTime),
        endTime: new Date(createEventDto.endTime),
        timezone: createEventDto.timezone ?? 'Europe/London',
        coverImageUrl: createEventDto.coverImageUrl,
        registrationTarget: createEventDto.registrationTarget ?? 100,
      },
    });

    await this.createAuditLog(user, 'EVENT_CREATED', 'Event', event.id, {
      title: event.title,
    });

    return event;
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
        archivedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        accessRules: true,
        contentModules: {
          orderBy: {
            order: 'asc',
          },
        },
        registrations: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
        recommendations: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        analyticsSnapshots: {
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertCanAccessEvent(user, event.createdById);

    return event;
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    updateEventDto: UpdateEventDto,
  ) {
    const existingEvent = await this.findEventForMutation(user, id);

    const event = await this.prisma.event.update({
      where: {
        id: existingEvent.id,
      },
      data: {
        title: updateEventDto.title,
        description: updateEventDto.description,
        eventType: updateEventDto.eventType,
        status: updateEventDto.status,
        startTime: updateEventDto.startTime
          ? new Date(updateEventDto.startTime)
          : undefined,
        endTime: updateEventDto.endTime
          ? new Date(updateEventDto.endTime)
          : undefined,
        timezone: updateEventDto.timezone,
        coverImageUrl: updateEventDto.coverImageUrl,
        registrationTarget: updateEventDto.registrationTarget,
      },
    });

    await this.createAuditLog(user, 'EVENT_UPDATED', 'Event', event.id, {
      title: event.title,
    });

    return event;
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    updateEventStatusDto: UpdateEventStatusDto,
  ) {
    const existingEvent = await this.findEventForMutation(user, id);

    const event = await this.prisma.event.update({
      where: {
        id: existingEvent.id,
      },
      data: {
        status: updateEventStatusDto.status,
      },
    });

    await this.createAuditLog(user, 'EVENT_STATUS_CHANGED', 'Event', event.id, {
      title: event.title,
      status: event.status,
    });

    return event;
  }

  async archive(user: AuthenticatedUser, id: string) {
    const existingEvent = await this.findEventForMutation(user, id);

    const event = await this.prisma.event.update({
      where: {
        id: existingEvent.id,
      },
      data: {
        archivedAt: new Date(),
      },
    });

    await this.createAuditLog(user, 'EVENT_ARCHIVED', 'Event', event.id, {
      title: event.title,
    });

    return {
      id: event.id,
      archivedAt: event.archivedAt,
    };
  }

  async getReadiness(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
        archivedAt: null,
      },
      include: {
        accessRules: true,
        contentModules: true,
        polls: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertCanAccessEvent(user, event.createdById);

    const checklist = [
      {
        key: 'details',
        label: 'Title and description are provided',
        completed: Boolean(event.title && event.description),
        points: 10,
      },
      {
        key: 'schedule',
        label: 'Start and end time are configured',
        completed: Boolean(event.startTime && event.endTime),
        points: 10,
      },
      {
        key: 'access-rule',
        label: 'Audience access rule is configured',
        completed: event.accessRules.length > 0,
        points: 20,
      },
      {
        key: 'content',
        label: 'At least one content module is configured',
        completed: event.contentModules.length > 0,
        points: 15,
      },
      {
        key: 'speaker',
        label: 'At least one speaker module is configured',
        completed: event.contentModules.some(
          (module) => module.type === 'SPEAKER',
        ),
        points: 10,
      },
      {
        key: 'engagement',
        label: 'At least one engagement tool is planned',
        completed: event.polls.length > 0,
        points: 10,
      },
      {
        key: 'registration-target',
        label: 'Registration target is defined',
        completed: event.registrationTarget > 0,
        points: 10,
      },
      {
        key: 'launch-ready',
        label: 'Event starts soon and required setup is complete',
        completed: this.isLaunchReady(event.startTime, [
          event.accessRules.length > 0,
          event.contentModules.length > 0,
        ]),
        points: 15,
      },
    ];

    const score = checklist.reduce((total, item) => {
      return total + (item.completed ? item.points : 0);
    }, 0);

    return {
      eventId: event.id,
      score,
      status: this.getReadinessStatus(score),
      checklist,
    };
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

  private isLaunchReady(startTime: Date, requiredItems: boolean[]) {
    const now = new Date();
    const daysUntilStart =
      (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    return daysUntilStart <= 7 && requiredItems.every(Boolean);
  }

  private getReadinessStatus(score: number) {
    if (score >= 80) {
      return 'READY';
    }

    if (score >= 50) {
      return 'NEEDS_WORK';
    }

    return 'AT_RISK';
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
