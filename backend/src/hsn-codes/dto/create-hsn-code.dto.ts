import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { IsGstRate } from '../../common/dto/field-validators.js';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';
import { CodeKind } from '../../generated/prisma/enums.js';
import { HsnRateDto } from './hsn-rate.dto.js';

// A new code with its first rate. The code's format is checked against its
// kind in the service (hsn-rules.ts).
export class CreateHsnCodeDto extends HsnRateDto {
  @IsEnum(CodeKind)
  kind: CodeKind;

  @Transform(trim)
  @IsString()
  code: string;

  @Transform(trim)
  @IsString()
  @Length(3, 200)
  description: string;

  @IsOptional()
  @IsGstRate()
  cessPct?: number | null;

  @IsOptional()
  @IsBoolean()
  reverseCharge?: boolean;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}
