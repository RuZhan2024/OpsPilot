import {
  MediaAssetSource,
  MediaAssetStatus,
  MediaAssetType,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FindMediaAssetsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

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
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}
