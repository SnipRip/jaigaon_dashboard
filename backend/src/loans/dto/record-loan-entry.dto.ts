import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { IsAmount, IsIsoDate } from '../../common/dto/field-validators.js';
import { trimToNull } from '../../common/dto/text-transforms.js';
import { LoanEntryKind } from '../../generated/prisma/enums.js';

// One entry against a loan. What each kind carries (and which voucher it
// makes) is checked in loan-rules.ts `entryProblem`; the screen fills the
// amounts from the schedule.
export class RecordLoanEntryDto {
  @IsEnum(LoanEntryKind)
  kind: LoanEntryKind;

  /** The schedule row it settles: an EMI, or a flexible loan's interest or repay-by date. */
  @IsOptional()
  @IsInt()
  @Min(1)
  instalmentNo?: number | null;

  @IsIsoDate('Pick the date of the entry')
  entryDate: string;

  @IsOptional()
  @IsAmount()
  principal?: number;

  /** Gross interest, before TDS. */
  @IsOptional()
  @IsAmount()
  interest?: number;

  @IsOptional()
  @IsAmount()
  tds?: number;

  @IsOptional()
  @IsAmount()
  charges?: number;

  /** Left out only for interest added to the loan. */
  @IsOptional()
  @IsUUID()
  bankAccountId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  reference?: string | null;

  /** Typed voucher number, when the series allows one; otherwise the next automatic number. */
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  voucherNumber?: string | null;
}
