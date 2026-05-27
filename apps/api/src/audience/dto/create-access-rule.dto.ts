import { AccessRuleType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAccessRuleDto {
  @IsEnum(AccessRuleType)
  type: AccessRuleType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domainWhitelist?: string[];

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}
