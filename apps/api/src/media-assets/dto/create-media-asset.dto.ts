import {
  MediaAssetSource,
  MediaAssetStatus,
  MediaAssetType,
} from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMediaAssetDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MediaAssetType)
  assetType!: MediaAssetType;

  @IsEnum(MediaAssetSource)
  source!: MediaAssetSource;

  @IsOptional()
  @IsEnum(MediaAssetStatus)
  status?: MediaAssetStatus;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsUrl()
  playbackUrl?: string;
}
