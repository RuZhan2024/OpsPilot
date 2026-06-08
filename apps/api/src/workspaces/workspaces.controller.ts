import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('current')
  findCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.findCurrent(user);
  }

  @Roles(Role.ADMIN)
  @Patch('current')
  updateCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.updateCurrent(user, updateWorkspaceDto);
  }
}
