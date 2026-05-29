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
import { ContentModulesService } from './content-modules.service';
import { CreateContentModuleDto } from './dto/create-content-module.dto';
import { ReorderContentModulesDto } from './dto/reorder-content-modules.dto';
import { UpdateContentModuleDto } from './dto/update-content-module.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ContentModulesController {
  constructor(private readonly contentModulesService: ContentModulesService) {}

  @Roles(Role.ADMIN, Role.EVENT_MANAGER, Role.ANALYST, Role.VIEWER)
  @Get('events/:eventId/content-modules')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.contentModulesService.findAll(user, eventId);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post('events/:eventId/content-modules')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body() createContentModuleDto: CreateContentModuleDto,
  ) {
    return this.contentModulesService.create(
      user,
      eventId,
      createContentModuleDto,
    );
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('content-modules/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateContentModuleDto: UpdateContentModuleDto,
  ) {
    return this.contentModulesService.update(user, id, updateContentModuleDto);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Delete('content-modules/:id')
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contentModulesService.delete(user, id);
  }

  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch('events/:eventId/content-modules/reorder')
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body() reorderContentModulesDto: ReorderContentModulesDto,
  ) {
    return this.contentModulesService.reorder(
      user,
      eventId,
      reorderContentModulesDto,
    );
  }
}
