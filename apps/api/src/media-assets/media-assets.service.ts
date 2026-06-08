import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaAssetStatus, Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { FindMediaAssetsQueryDto } from './dto/find-media-assets-query.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';

const mediaAssetInclude = {
  event: {
    select: {
      id: true,
      title: true,
      status: true,
      startTime: true,
      createdById: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  markers: {
    orderBy: {
      timestampSeconds: 'asc',
    },
  },
} satisfies Prisma.MediaAssetInclude;

@Injectable()
export class MediaAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, query: FindMediaAssetsQueryDto) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = Math.min(this.parsePositiveInt(query.pageSize, 10), 50);
    const where = this.buildMediaAssetWhere(user, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaAsset.findMany({
        where,
        include: mediaAssetInclude,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const mediaAsset = await this.prisma.mediaAsset.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
      },
      include: mediaAssetInclude,
    });

    if (!mediaAsset) {
      throw new NotFoundException('Media asset not found');
    }

    this.assertCanReadMediaAsset(user, mediaAsset);

    return mediaAsset;
  }

  async create(
    user: AuthenticatedUser,
    createMediaAssetDto: CreateMediaAssetDto,
  ) {
    if (createMediaAssetDto.eventId) {
      await this.findEventForMutation(user, createMediaAssetDto.eventId);
    }

    const mediaAsset = await this.prisma.mediaAsset.create({
      data: {
        workspaceId: user.workspaceId,
        createdById: user.id,
        eventId: createMediaAssetDto.eventId,
        title: createMediaAssetDto.title.trim(),
        description: createMediaAssetDto.description?.trim(),
        assetType: createMediaAssetDto.assetType,
        source: createMediaAssetDto.source,
        status: createMediaAssetDto.status ?? MediaAssetStatus.PROCESSING,
        durationSeconds: createMediaAssetDto.durationSeconds,
        sizeBytes: createMediaAssetDto.sizeBytes,
        thumbnailUrl: createMediaAssetDto.thumbnailUrl,
        playbackUrl: createMediaAssetDto.playbackUrl,
      },
      include: mediaAssetInclude,
    });

    await this.createAuditLog(
      user,
      'MEDIA_ASSET_CREATED',
      'MediaAsset',
      mediaAsset.id,
      {
        title: mediaAsset.title,
        assetType: mediaAsset.assetType,
        source: mediaAsset.source,
        status: mediaAsset.status,
        eventId: mediaAsset.eventId,
      },
    );

    return mediaAsset;
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    updateMediaAssetDto: UpdateMediaAssetDto,
  ) {
    const existingMediaAsset = await this.findMediaAssetForMutation(user, id);

    const mediaAsset = await this.prisma.mediaAsset.update({
      where: {
        id: existingMediaAsset.id,
      },
      data: {
        title: updateMediaAssetDto.title?.trim(),
        description: updateMediaAssetDto.description?.trim(),
        assetType: updateMediaAssetDto.assetType,
        source: updateMediaAssetDto.source,
        status: updateMediaAssetDto.status,
        durationSeconds: updateMediaAssetDto.durationSeconds,
        sizeBytes: updateMediaAssetDto.sizeBytes,
        thumbnailUrl: updateMediaAssetDto.thumbnailUrl,
        playbackUrl: updateMediaAssetDto.playbackUrl,
      },
      include: mediaAssetInclude,
    });

    await this.createAuditLog(
      user,
      'MEDIA_ASSET_UPDATED',
      'MediaAsset',
      mediaAsset.id,
      {
        title: mediaAsset.title,
        assetType: mediaAsset.assetType,
        status: mediaAsset.status,
      },
    );

    return mediaAsset;
  }

  async archive(user: AuthenticatedUser, id: string) {
    const existingMediaAsset = await this.findMediaAssetForMutation(user, id);

    const mediaAsset = await this.prisma.mediaAsset.update({
      where: {
        id: existingMediaAsset.id,
      },
      data: {
        status: MediaAssetStatus.ARCHIVED,
      },
      include: mediaAssetInclude,
    });

    await this.createAuditLog(
      user,
      'MEDIA_ASSET_ARCHIVED',
      'MediaAsset',
      mediaAsset.id,
      {
        title: mediaAsset.title,
        eventId: mediaAsset.eventId,
      },
    );

    return mediaAsset;
  }

  async findForEvent(user: AuthenticatedUser, eventId: string) {
    const event = await this.findEventForRead(user, eventId);

    return this.prisma.mediaAsset.findMany({
      where: {
        workspaceId: user.workspaceId,
        eventId: event.id,
      },
      include: mediaAssetInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async attachToEvent(
    user: AuthenticatedUser,
    eventId: string,
    assetId: string,
  ) {
    const event = await this.findEventForMutation(user, eventId);
    const existingMediaAsset = await this.findMediaAssetForMutation(
      user,
      assetId,
    );

    const mediaAsset = await this.prisma.mediaAsset.update({
      where: {
        id: existingMediaAsset.id,
      },
      data: {
        eventId: event.id,
      },
      include: mediaAssetInclude,
    });

    await this.createAuditLog(
      user,
      'MEDIA_ASSET_ATTACHED',
      'MediaAsset',
      mediaAsset.id,
      {
        eventId: event.id,
        eventTitle: event.title,
        title: mediaAsset.title,
      },
    );

    return mediaAsset;
  }

  private buildMediaAssetWhere(
    user: AuthenticatedUser,
    query: FindMediaAssetsQueryDto,
  ) {
    const and: Prisma.MediaAssetWhereInput[] = [
      {
        workspaceId: user.workspaceId,
      },
    ];

    if (query.search?.trim()) {
      const search = query.search.trim();
      and.push({
        OR: [
          {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            event: {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ],
      });
    }

    if (query.assetType) {
      and.push({ assetType: query.assetType });
    }

    if (query.source) {
      and.push({ source: query.source });
    }

    if (query.status) {
      and.push({ status: query.status });
    } else {
      and.push({
        status: {
          not: MediaAssetStatus.ARCHIVED,
        },
      });
    }

    if (user.role === Role.EVENT_MANAGER) {
      and.push({
        OR: [
          {
            createdById: user.id,
          },
          {
            event: {
              createdById: user.id,
            },
          },
        ],
      });
    }

    return { AND: and } satisfies Prisma.MediaAssetWhereInput;
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

  private async findMediaAssetForMutation(user: AuthenticatedUser, id: string) {
    const mediaAsset = await this.prisma.mediaAsset.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
      },
      include: {
        event: true,
      },
    });

    if (!mediaAsset) {
      throw new NotFoundException('Media asset not found');
    }

    this.assertCanMutateMediaAsset(user, mediaAsset);

    return mediaAsset;
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

  private assertCanReadMediaAsset(
    user: AuthenticatedUser,
    mediaAsset: {
      createdById: string | null;
      event: { createdById: string } | null;
    },
  ) {
    if (user.role !== Role.EVENT_MANAGER) {
      return;
    }

    if (
      mediaAsset.createdById === user.id ||
      mediaAsset.event?.createdById === user.id
    ) {
      return;
    }

    throw new ForbiddenException('You can only access media assets you own');
  }

  private assertCanMutateMediaAsset(
    user: AuthenticatedUser,
    mediaAsset: {
      createdById: string | null;
      event: { createdById: string } | null;
    },
  ) {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (
      user.role === Role.EVENT_MANAGER &&
      (mediaAsset.createdById === user.id ||
        mediaAsset.event?.createdById === user.id)
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to modify this media asset',
    );
  }

  private parsePositiveInt(value: string | undefined, fallback: number) {
    if (!value) {
      return fallback;
    }

    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue) || parsedValue < 1) {
      return fallback;
    }

    return parsedValue;
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
