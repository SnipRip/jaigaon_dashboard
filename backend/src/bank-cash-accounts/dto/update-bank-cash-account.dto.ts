import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { IsIsoDate, IsSignedAmount } from '../../common/dto/field-validators.js';
import { codeOrNull, lowerCaseOrNull, trim, trimToNull } from '../../common/dto/text-transforms.js';
import { LEDGER_NAME_MESSAGE, LEDGER_NAME_PATTERN } from '../../common/tally/tally-groups.js';
import { BankCashKind } from '../../generated/prisma/enums.js';
import {
  ACCOUNT_NUMBER_MESSAGE,
  ACCOUNT_NUMBER_PATTERN,
  IFSC_MESSAGE,
  IFSC_PATTERN,
  UPI_MESSAGE,
  UPI_PATTERN,
} from './create-bank-cash-account.dto.js';

// Send what changed. Unlike PartialType, a null in a required column (name,
// kind, balance, date, the flags) is refused, not skipped. The optional text
// fields take null to clear.
const sent = (_: object, value: unknown) => value !== undefined;

export class UpdateBankCashAccountDto {
  @Transform(trim)
  @ValidateIf(sent)
  @IsString()
  @Matches(LEDGER_NAME_PATTERN, { message: `Account name: ${LEDGER_NAME_MESSAGE}` })
  name?: string;

  @ValidateIf(sent)
  @IsEnum(BankCashKind)
  kind?: BankCashKind;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bankName?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  branch?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(ACCOUNT_NUMBER_PATTERN, { message: ACCOUNT_NUMBER_MESSAGE })
  accountNumber?: string | null;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(IFSC_PATTERN, { message: IFSC_MESSAGE })
  ifsc?: string | null;

  @Transform(lowerCaseOrNull)
  @IsOptional()
  @Matches(UPI_PATTERN, { message: UPI_MESSAGE })
  upiId?: string | null;

  @ValidateIf(sent)
  @IsSignedAmount()
  openingBalance?: number;

  @ValidateIf(sent)
  @IsIsoDate('Pick the date of the opening balance')
  openingDate?: string;

  @ValidateIf(sent)
  @IsBoolean()
  showOnInvoice?: boolean;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(LEDGER_NAME_PATTERN, { message: `Tally ledger name: ${LEDGER_NAME_MESSAGE}` })
  tallyLedgerName?: string | null;

  @ValidateIf(sent)
  @IsBoolean()
  isArchived?: boolean;
}
