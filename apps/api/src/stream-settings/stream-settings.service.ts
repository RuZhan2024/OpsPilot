import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Prisma, Role, StreamStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStreamSettingDto } from './dto/update-stream-setting.dto';

@Injectable()
export class StreamSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForEvent(user: AuthenticatedUser, eventId: string) {
    const event = await this.findEventForRead(user, eventId);

    const streamSetting = await this.prisma.streamSetting.findUnique({
      where: {
        eventId: event.id,
      },
    });

    if (streamSetting) {
      return streamSetting;
    }

    return this.prisma.streamSetting.create({
      data: this.buildDefaultStreamSetting(event),
    });
  }

  async updateForEvent(
    user: AuthenticatedUser,
    eventId: string,
    updateStreamSettingDto: UpdateStreamSettingDto,
  ) {
    const event = await this.findEventForMutation(user, eventId);

    const existingStreamSetting = await this.prisma.streamSetting.findUnique({
      where: {
        eventId: event.id,
      },
    });

    const streamSetting = existingStreamSetting
      ? await this.prisma.streamSetting.update({
          where: {
            id: existingStreamSetting.id,
          },
          data: updateStreamSettingDto,
        })
      : await this.prisma.streamSetting.create({
          data: {
            ...this.buildDefaultStreamSetting(event),
            ...updateStreamSettingDto,
          },
        });

    await this.createAuditLog(
      user,
      'STREAM_SETTINGS_UPDATED',
      'StreamSetting',
      streamSetting.id,
      {
        eventId: event.id,
        eventTitle: event.title,
        streamStatus: streamSetting.streamStatus,
        recordingEnabled: streamSetting.recordingEnabled,
        lowLatencyMode: streamSetting.lowLatencyMode,
        speakerTestCompleted: streamSetting.speakerTestCompleted,
        networkCheckCompleted: streamSetting.networkCheckCompleted,
      },
    );

    return streamSetting;
  }

  private async findEventForRead(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
        archivedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertCanAccessEvent(user, event.createdById);

    return event;
  }

  private async findEventForMutation(user: AuthenticatedUser, id: string) {
    const event = await this.findEventForRead(user, id);

    this.assertCanMutateEvent(user, event.createdById);

    return event;
  }

  private buildDefaultStreamSetting(event: {
    id: string;
    title: string;
    status: EventStatus;
  }) {
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
      .trim()
      .replace(/\/$/, '');

    return {
      eventId: event.id,
      ingestServerUrl:
        process.env.STREAM_INGEST_URL ?? 'rtmp://live.opspilot.dev/live',
      streamKey: `op_${event.id.slice(0, 8)}_${this.slugify(event.title).slice(
        0,
        18,
      )}`,
      streamStatus: this.getDefaultStreamStatus(event.status),
      recordingEnabled: true,
      lowLatencyMode: event.status === EventStatus.LIVE,
      speakerTestCompleted: event.status === EventStatus.LIVE,
      networkCheckCompleted: event.status === EventStatus.LIVE,
      backupStreamEnabled: false,
      viewerUrl: `${frontendUrl}/watch/${event.id}`,
      mobileViewerUrl: `${frontendUrl}/watch/${event.id}?view=mobile`,
    };
  }

  private getDefaultStreamStatus(status: EventStatus) {
    if (status === EventStatus.LIVE) {
      return StreamStatus.RECEIVING_SIGNAL;
    }

    if (status === EventStatus.SCHEDULED) {
      return StreamStatus.READY;
    }

    if (status === EventStatus.COMPLETED || status === EventStatus.CANCELLED) {
      return StreamStatus.OFFLINE;
    }

    return StreamStatus.NOT_CONFIGURED;
  }

  private slugify(value: string) {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'event'
    );
  }

  private assertCanAccessEvent(user: AuthenticatedUser, createdById: string) {
    if (user.role === Role.EVENT_MANAGER && createdById !== user.id) {
      throw new ForbiddenException('You can only access events you own');
    }
  }

  private assertCanMutateEvent(user: AuthenticatedUser, createdById: string) {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (user.role === Role.EVENT_MANAGER && createdById === user.id) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to modify this event',
    );
  }

  private async createAuditLog(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorUserId: user.id,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
  }
}
