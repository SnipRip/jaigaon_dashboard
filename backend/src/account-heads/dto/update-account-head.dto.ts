import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { IsGstRate } from '../../common/dto/field-validators.js';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';
import { LEDGER_NAME_MESSAGE, LEDGER_NAME_PATTERN } from '../../common/tally/tally-groups.js';
import { HeadAllocation, HeadGst, HeadNature } from '../../generated/prisma/enums.js';

// Send what changed. A null in a required column (name, nature, the archive
// flag) is refused, not skipped. GST, rate, allocation and notes take null.
const sent = (_: object, value: unknown) => value !== undefined;

export class UpdateAccountHeadDto {
  @Transform(trim)
  @ValidateIf(sent)
  @IsString()
  @Matches(LEDGER_NAME_PATTERN, { message: `Head name: ${LEDGER_NAME_MESSAGE}` })
  name?: string;

  @ValidateIf(sent)
  @IsEnum(HeadNature)
  nature?: HeadNature;

  @IsOptional()
  @IsEnum(HeadGst)
  gst?: HeadGst | null;

  @IsOptional()
  @IsGstRate()
  gstRatePct?: number | null;

  @IsOptional()
  @IsEnum(HeadAllocation)
  allocation?: HeadAllocation | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @ValidateIf(sent)
  @IsBoolean()
  isArchived?: boolean;
}
