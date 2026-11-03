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

export const LOAN_ACCOUNT_PATTERN = /^[A-Z0-9][A-Z0-9/-]{3,29}$/;
export const LOAN_ACCOUNT_MESSAGE = 'Loan account number is 4 to 30 letters, digits, - or /';

// Field formats only. How the fields fit together (kind for the direction,
// EMI or flexible terms, the disbursal's own field) is checked in
// loan-rules.ts.
export class CreateLoanDto {
  /** The loan's Tally ledger name. */
  @Transform(trim)
  @IsString()
  @Matches(LEDGER_NAME_PATTERN, { message: `Loan name: ${LEDGER_NAME_MESSAGE}` })
  name: string;

  @IsEnum(LoanDirection)
  direction: LoanDirection;

  @IsEnum(LoanKind)
  kind: LoanKind;

  @IsEnum(LoanRepayment)
  repayment: LoanRepayment;

  /** The lender (taken) or the borrower (given). */
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  partyName: string;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(LOAN_ACCOUNT_PATTERN, { message: LOAN_ACCOUNT_MESSAGE })
  loanAccountNumber?: string | null;

  @IsBoolean()
  isSecured: boolean;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  security?: string | null;

  @IsAmount()
  @Min(1)
  principal: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(50)
  interestRatePct: number;

  @IsIsoDate('Pick the date the loan was taken or given')
  disbursedOn: string;

  @IsEnum(LoanDisbursal)
  disbursal: LoanDisbursal;

  @IsOptional()
  @IsUUID()
  disbursalAccountId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(LEDGER_NAME_PATTERN, { message: `Asset ledger: ${LEDGER_NAME_MESSAGE}` })
  assetLedgerName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(479)
  paidBefore?: number;

  @IsOptional()
  @IsAmount()
  @Min(1)
  openingOutstanding?: number | null;

  // EMI loans.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  tenureMonths?: number | null;

  /** EMI loans: left out or null works it out by the reducing-balance formula. */
  @IsOptional()
  @IsAmount()
  @Min(1)
  emiAmount?: number | null;

  @IsOptional()
  @IsIsoDate('Pick the date of the first EMI')
  firstEmiDate?: string | null;

  // Flexible loans.
  @IsOptional()
  @IsEnum(InterestFrequency)
  interestFrequency?: InterestFrequency | null;

  @IsOptional()
  @IsIsoDate('Pick the first interest date')
  firstInterestDate?: string | null;

  @IsOptional()
  @IsIsoDate('Pick the repay-by date')
  maturityDate?: string | null;

  @IsUUID()
  repaymentAccountId: string;

  /** Left out or null: "Interest on Loan" (taken) or "Interest Received" (given). */
  @Transform(trimToNull)
  @IsOptional()
  @Matches(LEDGER_NAME_PATTERN, { message: `Interest ledger: ${LEDGER_NAME_MESSAGE}` })
  interestLedgerName?: string | null;

  /** TDS on interest, for non-bank lenders and borrowers; null: none. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(30)
  tdsRatePct?: number | null;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(LEDGER_NAME_PATTERN, { message: `TDS ledger: ${LEDGER_NAME_MESSAGE}` })
  tdsLedgerName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  reminderDays?: number;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
