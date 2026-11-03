import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsIsoDate, IsSignedAmount } from '../../common/dto/field-validators.js';
import { codeOrNull, lowerCaseOrNull, trim, trimToNull } from '../../common/dto/text-transforms.js';
import { LEDGER_NAME_MESSAGE, LEDGER_NAME_PATTERN } from '../../common/tally/tally-groups.js';
import { BankCashKind } from '../../generated/prisma/enums.js';

export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const IFSC_MESSAGE = 'IFSC is 11 characters: 4 letters, 0, then 6 letters or digits, like SBIN0001234';
export const ACCOUNT_NUMBER_PATTERN = /^\d{9,18}$/;
export const ACCOUNT_NUMBER_MESSAGE = 'Account number is 9 to 18 digits';
export const UPI_PATTERN = /^[a-z0-9._-]{2,64}@[a-z][a-z0-9]{1,63}$/;
export const UPI_MESSAGE = 'UPI ID looks like jaigaonquality@sbi';

// Field formats only. How the fields fit together (no bank fields on cash,
// below zero only for an overdraft) is checked in bank-cash-rules.ts.
export class CreateBankCashAccountDto {
  @Transform(trim)
  @IsString()
  @Matches(LEDGER_NAME_PATTERN, { message: `Account name: ${LEDGER_NAME_MESSAGE}` })
  name: string;

  @IsEnum(BankCashKind)
  kind: BankCashKind;

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

  /** Negative only for an overdraft: the amount already drawn. */
  @IsSignedAmount()
  openingBalance: number;

  @IsIsoDate('Pick the date of the opening balance')
  openingDate: string;

  @IsBoolean()
  showOnInvoice: boolean;

  /** Left out or null: the ledger carries the account name. */
  @Transform(trimToNull)
  @IsOptional()
  @Matches(LEDGER_NAME_PATTERN, { message: `Tally ledger name: ${LEDGER_NAME_MESSAGE}` })
  tallyLedgerName?: string | null;
}
