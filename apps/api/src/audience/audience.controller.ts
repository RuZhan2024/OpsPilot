import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AudienceService } from './audience.service';
import { BulkCreateInvitationsDto } from './dto/bulk-create-invitations.dto';
import { CreateAccessRuleDto } from './dto/create-access-rule.dto';
import { CreateAudienceGroupDto } from './dto/create-audience-group.dto';
import { UpdateAccessRuleDto } from './dto/update-access-rule.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AudienceController {
  constructor(private readonly audienceService: AudienceService) {}

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('audience-groups')
  findAudienceGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.audienceService.findAudienceGroups(user);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post('audience-groups')
  createAudienceGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createAudienceGroupDto: CreateAudienceGroupDto,
  ) {
    return this.audienceService.createAudienceGroup(
      user,
      createAudienceGroupDto,
    );
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('events/:eventId/access-rules')
  findAccessRules(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.audienceService.findAccessRules(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post('events/:eventId/access-rules')
  createAccessRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body() createAccessRuleDto: CreateAccessRuleDto,
  ) {
    return this.audienceService.createAccessRule(
      user,
      eventId,
      createAccessRuleDto,
    );
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('access-rules/:id')
  updateAccessRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateAccessRuleDto: UpdateAccessRuleDto,
  ) {
    return this.audienceService.updateAccessRule(user, id, updateAccessRuleDto);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Delete('access-rules/:id')
  deleteAccessRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.audienceService.deleteAccessRule(user, id);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST)
  @Get('events/:eventId/registrations')
  findRegistrations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.audienceService.findRegistrations(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST)
  @Get('events/:eventId/invitations')
  findInvitations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.audienceService.findInvitations(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post('events/:eventId/invitations/bulk')
  bulkCreateInvitations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body() bulkCreateInvitationsDto: BulkCreateInvitationsDto,
  ) {
    return this.audienceService.bulkCreateInvitations(
      user,
      eventId,
      bulkCreateInvitationsDto,
    );
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('registrations/:id/approve')
  approveRegistration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.audienceService.updateRegistrationStatus(user, id, 'APPROVED');
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('registrations/:id/reject')
  rejectRegistration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.audienceService.updateRegistrationStatus(user, id, 'REJECTED');
  }
}
