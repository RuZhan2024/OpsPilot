import { PollStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePollDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  question?: string;

  @IsOptional()
  @IsEnum(PollStatus)
  status?: PollStatus;
}
