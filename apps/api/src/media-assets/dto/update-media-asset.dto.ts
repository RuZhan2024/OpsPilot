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

export class UpdateMediaAssetDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MediaAssetType)
  assetType?: MediaAssetType;

  @IsOptional()
  @IsEnum(MediaAssetSource)
  source?: MediaAssetSource;

  @IsOptional()
  @IsEnum(MediaAssetStatus)
  status?: MediaAssetStatus;

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
