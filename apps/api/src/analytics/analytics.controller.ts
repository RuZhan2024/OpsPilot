import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('dashboard/summary')
  getDashboardSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getDashboardSummary(user);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('events/:eventId/analytics')
  getEventAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.analyticsService.getEventAnalytics(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('events/:eventId/analytics/timeseries')
  getEventTimeseries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.analyticsService.getEventTimeseries(user, eventId);
  }
}
