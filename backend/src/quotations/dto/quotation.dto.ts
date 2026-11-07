import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateNested } from 'class-validator';
import { IsAmount, IsDiscountPct, IsIsoDate, IsQuantity } from '../../common/dto/field-validators.js';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';
import { QuotationStatus } from '../../generated/prisma/enums.js';
import { MAX_LINE_ITEMS } from '../../pricing/dto/line-rate-options.dto.js';

export class QuotationLineDto {
  @IsUUID()
  itemId: string;

  /** One of the item's units (symbol); left out = the base unit. */
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string | null;

  /** In `unit`. */
  @IsQuantity()
  quantity: number;

  /** Per `unit` before GST. Where it came from is worked out on save. */
  @IsAmount()
  rate: number;

  @IsOptional()
  @IsDiscountPct()
  discountPct?: number;
}

// Field formats only; quotations.service.ts checks the customer, items and
// dates, takes GST and costs from the masters and applies the schemes.
export class QuotationDto {
  @IsUUID()
  partyId: string;

  @IsIsoDate('Pick the quotation date')
  date: string;

  @IsIsoDate('Pick the validity date')
  validUntil: string;

  /** Saved as a draft (not shown as "last quoted") or given to the customer. */
  @IsOptional()
  @IsEnum([QuotationStatus.DRAFT, QuotationStatus.SENT])
  status?: 'DRAFT' | 'SENT';

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  terms?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => QuotationLineDto)
  lines: QuotationLineDto[];
}

export class ReviseQuotationDto extends QuotationDto {
  /** Why it was revised, kept with the old total. */
  @Transform(trim)
  @IsString()
  @Length(2, 200)
  note: string;
}

export class QuotationStatusDto {
  @IsEnum(QuotationStatus)
  status: QuotationStatus;
}
