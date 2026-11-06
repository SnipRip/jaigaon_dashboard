import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { IsAmount, IsIsoDate } from '../../common/dto/field-validators.js';
import { codeOrNull, trim, trimToNull } from '../../common/dto/text-transforms.js';
import { HeadAllocation, PaymentMode } from '../../generated/prisma/enums.js';
import { EXPENSE_RATES } from '../expense-rules.js';

// Field formats only; expenses.service.ts checks the head, the payee, the
// account, the GST and the allocation.
export class CreateExpenseDto {
  @IsIsoDate('Pick the date')
  date: string;

  @IsUUID()
  headId: string;

  @Transform(trim)
  @IsString()
  @Length(1, 120)
  description: string;

  /** Before GST. */
  @IsAmount()
  amount: number;

  /** The rate on the payee's bill; the head or vendor may override it (expense-rules.ts). */
  @IsOptional()
  @IsIn(EXPENSE_RATES)
  gstRatePct?: number;

  /** A payee by name: whether they gave a GST tax invoice. Ignored for a vendor on record. */
  @IsOptional()
  @IsBoolean()
  gstBill?: boolean;

  /** False when the credit is blocked (s.17(5)): the GST becomes cost. */
  @IsOptional()
  @IsBoolean()
  itcEligible?: boolean;

  @IsOptional()
  @IsUUID()
  vendorId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  payee?: string | null;

  /** None: owed to the vendor (on credit). */
  @IsOptional()
  @IsUUID()
  accountId?: string | null;

  @IsOptional()
  @IsEnum(PaymentMode)
  mode?: PaymentMode | null;

  @IsEnum(HeadAllocation)
  allocation: HeadAllocation;

  /** The goods bill (ITEM_COST) or invoice (INVOICE). */
  @IsOptional()
  @IsUUID()
  targetId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  reference?: string | null;

  /** Typed only when the series allows it; blank takes the next number. */
  @Transform(codeOrNull)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  number?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class CancelExpenseDto {
  @Transform(trim)
  @IsString()
  @Length(2, 200)
  reason: string;
}

export class ExpenseQueryDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsEnum(HeadAllocation)
  allocation?: HeadAllocation;

  @IsOptional()
  @IsUUID()
  billId?: string;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;
}
