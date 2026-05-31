import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AuditLogsService } from './audit-logs.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Roles(Role.ADMIN)
  @Get('audit-logs')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.auditLogsService.findAll(user);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST)
  @Get('events/:eventId/audit-logs')
  findByEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.auditLogsService.findByEvent(user, eventId);
  }
}
