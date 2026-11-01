import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { IsPhone } from '../../common/dto/field-validators.js';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';
import { GodownKind } from '../../generated/prisma/enums.js';

export class CreateGodownDto {
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  name: string;

  @Transform(trim)
  @IsString()
  @Length(2, 300)
  address: string;

  @IsEnum(GodownKind)
  kind: GodownKind;

  @IsBoolean()
  isDefault: boolean;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  inCharge?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsPhone()
  phone?: string | null;
}
