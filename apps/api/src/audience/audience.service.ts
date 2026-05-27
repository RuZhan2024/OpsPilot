import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessRuleType, Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccessRuleDto } from './dto/create-access-rule.dto';
import { CreateAudienceGroupDto } from './dto/create-audience-group.dto';
import { UpdateAccessRuleDto } from './dto/update-access-rule.dto';

@Injectable()
export class AudienceService {
  constructor(private readonly prisma: PrismaService) {}

  findAudienceGroups(user: AuthenticatedUser) {
    return this.prisma.audienceGroup.findMany({
      where: {
        workspaceId: user.workspaceId,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async createAudienceGroup(
    user: AuthenticatedUser,
    createAudienceGroupDto: CreateAudienceGroupDto,
  ) {
    const audienceGroup = await this.prisma.audienceGroup.create({
      data: {
        workspaceId: user.workspaceId,
        name: createAudienceGroupDto.name,
        description: createAudienceGroupDto.description,
      },
    });

    await this.createAuditLog(
      user,
      'AUDIENCE_GROUP_CREATED',
      'AudienceGroup',
      audienceGroup.id,
      {
        name: audienceGroup.name,
      },
    );

    return audienceGroup;
  }

  async findAccessRules(user: AuthenticatedUser, eventId: string) {
    await this.findEventForRead(user, eventId);

    return this.prisma.accessRule.findMany({
      where: {
        eventId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async createAccessRule(
    user: AuthenticatedUser,
    eventId: string,
    createAccessRuleDto: CreateAccessRuleDto,
  ) {
    const event = await this.findEventForMutation(user, eventId);
    const domainWhitelist = this.normalizeDomainWhitelist(
      createAccessRuleDto.domainWhitelist,
    );

    this.validateAccessRule(createAccessRuleDto.type, domainWhitelist);

    const accessRule = await this.prisma.accessRule.create({
      data: {
        eventId: event.id,
        type: createAccessRuleDto.type,
        domainWhitelist,
        requiresApproval: createAccessRuleDto.requiresApproval ?? false,
      },
    });

    await this.createAuditLog(
      user,
      'ACCESS_RULE_CREATED',
      'AccessRule',
      accessRule.id,
      {
        eventId: event.id,
        eventTitle: event.title,
        type: accessRule.type,
        domainWhitelist: accessRule.domainWhitelist,
        requiresApproval: accessRule.requiresApproval,
      },
    );

    return accessRule;
  }

  async updateAccessRule(
    user: AuthenticatedUser,
    id: string,
    updateAccessRuleDto: UpdateAccessRuleDto,
  ) {
    const existingAccessRule = await this.findAccessRuleForMutation(user, id);
    const domainWhitelist =
      updateAccessRuleDto.domainWhitelist === undefined
        ? existingAccessRule.domainWhitelist
        : this.normalizeDomainWhitelist(updateAccessRuleDto.domainWhitelist);

    const type = updateAccessRuleDto.type ?? existingAccessRule.type;

    this.validateAccessRule(type, domainWhitelist);

    const accessRule = await this.prisma.accessRule.update({
      where: {
        id: existingAccessRule.id,
      },
      data: {
        type: updateAccessRuleDto.type,
        domainWhitelist:
          updateAccessRuleDto.domainWhitelist === undefined
            ? undefined
            : domainWhitelist,
        requiresApproval: updateAccessRuleDto.requiresApproval,
      },
    });

    await this.createAuditLog(
      user,
      'ACCESS_RULE_UPDATED',
      'AccessRule',
      accessRule.id,
      {
        eventId: existingAccessRule.event.id,
        eventTitle: existingAccessRule.event.title,
        type: accessRule.type,
        domainWhitelist: accessRule.domainWhitelist,
        requiresApproval: accessRule.requiresApproval,
      },
    );

    return accessRule;
  }

  async deleteAccessRule(user: AuthenticatedUser, id: string) {
    const existingAccessRule = await this.findAccessRuleForMutation(user, id);

    await this.prisma.accessRule.delete({
      where: {
        id: existingAccessRule.id,
      },
    });

    await this.createAuditLog(
      user,
      'ACCESS_RULE_DELETED',
      'AccessRule',
      existingAccessRule.id,
      {
        eventId: existingAccessRule.event.id,
        eventTitle: existingAccessRule.event.title,
        type: existingAccessRule.type,
      },
    );

    return {
      id: existingAccessRule.id,
      deleted: true,
    };
  }

  async findRegistrations(user: AuthenticatedUser, eventId: string) {
    await this.findEventForRead(user, eventId);

    return this.prisma.registration.findMany({
      where: {
        eventId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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

  private async findAccessRuleForMutation(user: AuthenticatedUser, id: string) {
    const accessRule = await this.prisma.accessRule.findFirst({
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

    if (!accessRule) {
      throw new NotFoundException('Access rule not found');
    }

    this.assertCanMutateEvent(user, accessRule.event.createdById);

    return accessRule;
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

  private normalizeDomainWhitelist(domainWhitelist?: string[]) {
    if (!domainWhitelist) {
      return [];
    }

    const normalizedDomains = domainWhitelist
      .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);

    return Array.from(new Set(normalizedDomains));
  }

  private validateAccessRule(type: AccessRuleType, domainWhitelist: string[]) {
    if (
      type === AccessRuleType.EMAIL_DOMAIN_RESTRICTED &&
      domainWhitelist.length === 0
    ) {
      throw new BadRequestException(
        'Email domain restricted rules require at least one domain',
      );
    }
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
