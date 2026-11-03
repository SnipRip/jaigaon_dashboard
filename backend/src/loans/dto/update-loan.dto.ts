import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsAmount, IsIsoDate } from '../../common/dto/field-validators.js';
import { codeOrNull, trim, trimToNull } from '../../common/dto/text-transforms.js';
import { LEDGER_NAME_MESSAGE, LEDGER_NAME_PATTERN } from '../../common/tally/tally-groups.js';
import {
  InterestFrequency,
  LoanDirection,
  LoanDisbursal,
  LoanKind,
  LoanRepayment,
} from '../../generated/prisma/enums.js';
import { LOAN_ACCOUNT_MESSAGE, LOAN_ACCOUNT_PATTERN } from './create-loan.dto.js';

// Send what changed. A null in a required column (name, direction, amounts,
// dates, accounts, flags) is refused, not skipped; the optional fields take
// null to clear. A null EMI is worked out again from the terms.
const sent = (_: object, value: unknown) => value !== undefined;

export class UpdateLoanDto {
  @Transform(trim)
  @ValidateIf(sent)
  @IsString()
  @Matches(LEDGER_NAME_PATTERN, { message: `Loan name: ${LEDGER_NAME_MESSAGE}` })
  name?: string;

  @ValidateIf(sent)
  @IsEnum(LoanDirection)
  direction?: LoanDirection;

  @ValidateIf(sent)
  @IsEnum(LoanKind)
  kind?: LoanKind;

  @ValidateIf(sent)
  @IsEnum(LoanRepayment)
  repayment?: LoanRepayment;

  @Transform(trim)
  @ValidateIf(sent)
  @IsString()
  @Length(2, 80)
  partyName?: string;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(LOAN_ACCOUNT_PATTERN, { message: LOAN_ACCOUNT_MESSAGE })
  loanAccountNumber?: string | null;

  @ValidateIf(sent)
  @IsBoolean()
  isSecured?: boolean;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  security?: string | null;

  @ValidateIf(sent)
  @IsAmount()
  @Min(1)
  principal?: number;

  @ValidateIf(sent)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(50)
  interestRatePct?: number;

  @ValidateIf(sent)
  @IsIsoDate('Pick the date the loan was taken or given')
  disbursedOn?: string;

  @ValidateIf(sent)
  @IsEnum(LoanDisbursal)
  disbursal?: LoanDisbursal;

  @IsOptional()
  @IsUUID()
  disbursalAccountId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(LEDGER_NAME_PATTERN, { message: `Asset ledger: ${LEDGER_NAME_MESSAGE}` })
  assetLedgerName?: string | null;

  @ValidateIf(sent)
  @IsInt()
  @Min(0)
  @Max(479)
  paidBefore?: number;

  @IsOptional()
  @IsAmount()
  @Min(1)
  openingOutstanding?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  tenureMonths?: number | null;

  @IsOptional()
  @IsAmount()
  @Min(1)
  emiAmount?: number | null;

  @IsOptional()
  @IsIsoDate('Pick the date of the first EMI')
  firstEmiDate?: string | null;

  @IsOptional()
  @IsEnum(InterestFrequency)
  interestFrequency?: InterestFrequency | null;

  @IsOptional()
  @IsIsoDate('Pick the first interest date')
  firstInterestDate?: string | null;

  @IsOptional()
  @IsIsoDate('Pick the repay-by date')
  maturityDate?: string | null;

  @ValidateIf(sent)
  @IsUUID()
  repaymentAccountId?: string;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(LEDGER_NAME_PATTERN, { message: `Interest ledger: ${LEDGER_NAME_MESSAGE}` })
  interestLedgerName?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(30)
  tdsRatePct?: number | null;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(LEDGER_NAME_PATTERN, { message: `TDS ledger: ${LEDGER_NAME_MESSAGE}` })
  tdsLedgerName?: string | null;

  @ValidateIf(sent)
  @IsInt()
  @Min(0)
  @Max(30)
  reminderDays?: number;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @ValidateIf(sent)
  @IsBoolean()
  isArchived?: boolean;
}
