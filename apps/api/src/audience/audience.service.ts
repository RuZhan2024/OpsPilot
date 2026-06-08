import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccessRuleType,
  Prisma,
  RegistrationStatus,
  Role,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { BulkCreateInvitationsDto } from './dto/bulk-create-invitations.dto';
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

  async findInvitations(user: AuthenticatedUser, eventId: string) {
    await this.findEventForRead(user, eventId);

    return this.prisma.invitation.findMany({
      where: {
        eventId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async bulkCreateInvitations(
    user: AuthenticatedUser,
    eventId: string,
    bulkCreateInvitationsDto: BulkCreateInvitationsDto,
  ) {
    const event = await this.findEventForMutation(user, eventId);
    const emails = this.normalizeEmails(bulkCreateInvitationsDto.emails);

    if (emails.length === 0) {
      throw new BadRequestException('At least one valid email is required');
    }

    const [existingInvitations, existingRegistrations] = await Promise.all([
      this.prisma.invitation.findMany({
        where: {
          eventId: event.id,
          email: {
            in: emails,
          },
        },
        select: {
          email: true,
        },
      }),
      this.prisma.registration.findMany({
        where: {
          eventId: event.id,
          email: {
            in: emails,
          },
        },
        select: {
          email: true,
        },
      }),
    ]);

    const existingInvitationEmails = new Set(
      existingInvitations.map((invitation) => invitation.email),
    );
    const existingRegistrationEmails = new Set(
      existingRegistrations.map((registration) => registration.email),
    );
    const emailsToCreate = emails.filter(
      (email) =>
        !existingInvitationEmails.has(email) &&
        !existingRegistrationEmails.has(email),
    );

    if (emailsToCreate.length > 0) {
      await this.prisma.invitation.createMany({
        data: emailsToCreate.map((email) => ({
          eventId: event.id,
          email,
        })),
      });
    }

    await this.createAuditLog(
      user,
      'INVITATIONS_IMPORTED',
      'Invitation',
      event.id,
      {
        eventId: event.id,
        eventTitle: event.title,
        importedCount: emailsToCreate.length,
        skippedExistingInvitations: existingInvitationEmails.size,
        skippedExistingRegistrations: existingRegistrationEmails.size,
      },
    );

    return {
      eventId: event.id,
      importedCount: emailsToCreate.length,
      skippedExistingInvitations: Array.from(existingInvitationEmails),
      skippedExistingRegistrations: Array.from(existingRegistrationEmails),
      importedEmails: emailsToCreate,
    };
  }

  async updateRegistrationStatus(
    user: AuthenticatedUser,
    id: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    const existingRegistration = await this.findRegistrationForMutation(
      user,
      id,
    );

    if (existingRegistration.status === RegistrationStatus.ATTENDED) {
      throw new BadRequestException(
        'Attended registrations cannot be approved or rejected',
      );
    }

    const registration = await this.prisma.registration.update({
      where: {
        id: existingRegistration.id,
      },
      data: {
        status,
      },
    });

    await this.createAuditLog(
      user,
      status === RegistrationStatus.APPROVED
        ? 'REGISTRATION_APPROVED'
        : 'REGISTRATION_REJECTED',
      'Registration',
      registration.id,
      {
        eventId: existingRegistration.event.id,
        eventTitle: existingRegistration.event.title,
        email: registration.email,
        status: registration.status,
      },
    );

    return registration;
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

  private async findRegistrationForMutation(
    user: AuthenticatedUser,
    id: string,
  ) {
    const registration = await this.prisma.registration.findFirst({
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

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    this.assertCanMutateEvent(user, registration.event.createdById);

    return registration;
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

  private normalizeEmails(emails: string[]) {
    const normalizedEmails = emails
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    return Array.from(new Set(normalizedEmails));
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
