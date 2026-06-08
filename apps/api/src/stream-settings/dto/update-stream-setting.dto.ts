import { StreamStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateStreamSettingDto {
  @IsOptional()
  @IsString()
  ingestServerUrl?: string;

  @IsOptional()
  @IsString()
  streamKey?: string;

  @IsOptional()
  @IsEnum(StreamStatus)
  streamStatus?: StreamStatus;

  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  lowLatencyMode?: boolean;

  @IsOptional()
  @IsBoolean()
  speakerTestCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  networkCheckCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  backupStreamEnabled?: boolean;

  @IsOptional()
  @IsString()
  viewerUrl?: string;

  @IsOptional()
  @IsString()
  mobileViewerUrl?: string;
}
