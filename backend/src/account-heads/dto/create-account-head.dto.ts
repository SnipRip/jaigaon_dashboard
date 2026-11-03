import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsGstRate } from '../../common/dto/field-validators.js';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';
import { LEDGER_NAME_MESSAGE, LEDGER_NAME_PATTERN } from '../../common/tally/tally-groups.js';
import { HeadAllocation, HeadGst, HeadNature } from '../../generated/prisma/enums.js';

// Field formats only. Which fields a nature takes (GST and allocation on
// expense heads only) is checked in account-head-rules.ts.
export class CreateAccountHeadDto {
  @Transform(trim)
  @IsString()
  @Matches(LEDGER_NAME_PATTERN, { message: `Head name: ${LEDGER_NAME_MESSAGE}` })
  name: string;

  @IsEnum(HeadNature)
  nature: HeadNature;

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
}
