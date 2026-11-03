import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { IsAmount } from '../../common/dto/field-validators.js';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';
import { LEDGER_NAME_MESSAGE, LEDGER_NAME_PATTERN } from '../../common/tally/tally-groups.js';
import { DrCr, TaxKind } from '../../generated/prisma/enums.js';

// Field formats only; which group and tax kind fit is ledger-rules.ts.
export class CreateLedgerDto {
  @Transform(trim)
  @IsString()
  @Matches(LEDGER_NAME_PATTERN, { message: `Ledger name: ${LEDGER_NAME_MESSAGE}` })
  name: string;

  @IsUUID()
  groupId: string;

  @IsOptional()
  @IsAmount()
  openingBalance?: number;

  @IsOptional()
  @IsEnum(DrCr)
  openingSide?: DrCr;

  /** Ledgers under Duties & Taxes only. */
  @IsOptional()
  @IsEnum(TaxKind)
  taxKind?: TaxKind | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
