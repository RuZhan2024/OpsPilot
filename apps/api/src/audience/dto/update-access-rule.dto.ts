import { AccessRuleType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAccessRuleDto {
  @IsOptional()
  @IsEnum(AccessRuleType)
  type?: AccessRuleType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domainWhitelist?: string[];

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}
