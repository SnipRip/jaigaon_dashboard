import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateNested } from 'class-validator';
import { IsAmount, IsIsoDate } from '../../common/dto/field-validators.js';
import { codeOrNull, trim, trimToNull } from '../../common/dto/text-transforms.js';
import { PaymentMode, SettlementDirection } from '../../generated/prisma/enums.js';

/** Enough for a big customer clearing a year of invoices at once. */
export const MAX_ALLOCATIONS = 200;

// Field formats only; settlements.service.ts checks the party, the account,
// the balances and the BRC.
export class AllocationDto {
  /**
   * INVOICE for receipts, BILL or EXPENSE (bought on credit) for payments,
   * OPENING for the party's opening balance, ADVANCE on a refund (the receipt
   * or payment whose advance it gives back).
   */
  @IsIn(['INVOICE', 'BILL', 'EXPENSE', 'OPENING', 'ADVANCE'])
  kind: 'INVOICE' | 'BILL' | 'EXPENSE' | 'OPENING' | 'ADVANCE';

  /** The invoice, bill, expense or advance's settlement; for OPENING the party's own id. */
  @IsUUID()
  documentId: string;

  @IsAmount()
  amount: number;
}

export class SettlementDto {
  @IsEnum(SettlementDirection)
  direction: SettlementDirection;

  @IsUUID()
  partyId: string;

  @IsIsoDate('Pick the date')
  date: string;

  @IsUUID()
  accountId: string;

  @IsEnum(PaymentMode)
  mode: PaymentMode;

  @IsAmount()
  amount: number;

  @IsOptional()
  @IsAmount()
  tds?: number;

  /** Typed only when the series allows it; blank takes the next number. */
  @Transform(codeOrNull)
  @IsOptional()
  @IsString()
  @MaxLength(16)
  number?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  reference?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  brcNumber?: string | null;

  @IsOptional()
  @IsIsoDate('Pick the BRC date')
  brcDate?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;

  @IsArray()
  @ArrayMaxSize(MAX_ALLOCATIONS)
  @ValidateNested({ each: true })
  @Type(() => AllocationDto)
  allocations: AllocationDto[];
}

/** Applies what a settlement left as an advance to documents opened since. */
export class ApplyAdvanceDto {
  @IsArray()
  @ArrayMaxSize(MAX_ALLOCATIONS)
  @ValidateNested({ each: true })
  @Type(() => AllocationDto)
  allocations: AllocationDto[];
}

export class CancelSettlementDto {
  @Transform(trim)
  @IsString()
  @Length(2, 200)
  reason: string;
}

export class SettlementQueryDto {
  @IsOptional()
  @IsEnum(SettlementDirection)
  direction?: SettlementDirection;

  @IsOptional()
  @IsUUID()
  partyId?: string;
}

export class OpenDocumentsQueryDto {
  @IsEnum(SettlementDirection)
  direction: SettlementDirection;

  @IsOptional()
  @IsUUID()
  partyId?: string;
}
