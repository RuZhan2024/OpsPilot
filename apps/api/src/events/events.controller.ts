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
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.findAll(user);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createEventDto: CreateEventDto,
  ) {
    return this.eventsService.create(user, createEventDto);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.findOne(user, id);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(user, id, updateEventDto);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateEventStatusDto: UpdateEventStatusDto,
  ) {
    return this.eventsService.updateStatus(user, id, updateEventStatusDto);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Delete(':id')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.eventsService.archive(user, id);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get(':id/readiness')
  getReadiness(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.eventsService.getReadiness(user, id);
  }
}
