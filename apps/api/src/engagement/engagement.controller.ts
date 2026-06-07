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
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { EngagementService } from './engagement.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('events/:eventId/polls')
  findPolls(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.engagementService.findPolls(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post('events/:eventId/polls')
  createPoll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body() createPollDto: CreatePollDto,
  ) {
    return this.engagementService.createPoll(user, eventId, createPollDto);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('polls/:id')
  updatePoll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updatePollDto: UpdatePollDto,
  ) {
    return this.engagementService.updatePoll(user, id, updatePollDto);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Delete('polls/:id')
  deletePoll(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.engagementService.deletePoll(user, id);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('polls/:id/results')
  getPollResults(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.engagementService.getPollResults(user, id);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('events/:eventId/questions')
  findQuestions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.engagementService.findQuestions(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('questions/:id/answer')
  markQuestionAnswered(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.engagementService.markQuestionAnswered(user, id);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('events/:eventId/feedback')
  findFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.engagementService.findFeedback(user, eventId);
  }
}
