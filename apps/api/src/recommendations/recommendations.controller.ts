import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RecommendationsService } from './recommendations.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('events/:eventId/recommendations')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.recommendationsService.findAll(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post('events/:eventId/recommendations/generate')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.recommendationsService.generate(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('recommendations/:id/resolve')
  resolve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.recommendationsService.resolve(user, id);
  }
}
