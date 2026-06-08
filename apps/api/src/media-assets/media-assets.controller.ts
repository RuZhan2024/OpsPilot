import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { FindMediaAssetsQueryDto } from './dto/find-media-assets-query.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';
import { MediaAssetsService } from './media-assets.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('media-assets')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FindMediaAssetsQueryDto,
  ) {
    return this.mediaAssetsService.findAll(user, query);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post('media-assets')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createMediaAssetDto: CreateMediaAssetDto,
  ) {
    return this.mediaAssetsService.create(user, createMediaAssetDto);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('media-assets/:id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mediaAssetsService.findOne(user, id);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('media-assets/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateMediaAssetDto: UpdateMediaAssetDto,
  ) {
    return this.mediaAssetsService.update(user, id, updateMediaAssetDto);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('media-assets/:id/archive')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mediaAssetsService.archive(user, id);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('events/:eventId/media-assets')
  findForEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.mediaAssetsService.findForEvent(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post('events/:eventId/media-assets/:assetId/attach')
  attachToEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.mediaAssetsService.attachToEvent(user, eventId, assetId);
  }
}
