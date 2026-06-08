import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateStreamSettingDto } from './dto/update-stream-setting.dto';
import { StreamSettingsService } from './stream-settings.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class StreamSettingsController {
  constructor(private readonly streamSettingsService: StreamSettingsService) {}

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('events/:eventId/stream-settings')
  findForEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.streamSettingsService.findForEvent(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('events/:eventId/stream-settings')
  updateForEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body() updateStreamSettingDto: UpdateStreamSettingDto,
  ) {
    return this.streamSettingsService.updateForEvent(
      user,
      eventId,
      updateStreamSettingDto,
    );
  }
}
