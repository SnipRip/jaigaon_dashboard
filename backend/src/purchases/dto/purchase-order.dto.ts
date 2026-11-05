import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { IsAmount, IsDiscountPct, IsGstRate, IsIsoDate, IsQuantity } from '../../common/dto/field-validators.js';
import { trimToNull } from '../../common/dto/text-transforms.js';
import { MAX_LINE_ITEMS } from '../../pricing/dto/line-rate-options.dto.js';

export class PurchaseOrderLineDto {
  @IsUUID()
  itemId: string;

  /** Base units. */
  @IsQuantity()
  quantity: number;

  /** Per base unit, before GST: the rate agreed with the vendor. */
  @IsAmount()
  rate: number;

  @IsOptional()
  @IsDiscountPct()
  discountPct?: number;

  /** Left out: the item's rate on the order date. */
  @IsOptional()
  @IsGstRate()
  gstRatePct?: number;
}

// Field formats only; purchase-orders.service.ts checks the vendor, godown,
// items and dates.
export class PurchaseOrderDto {
  @IsUUID()
  vendorId: string;

  @IsIsoDate('Pick the order date')
  date: string;

  @IsOptional()
  @IsIsoDate('Expected date is a date')
  expectedDate?: string | null;

  @IsUUID()
  godownId: string;

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
  @Type(() => PurchaseOrderLineDto)
  lines: PurchaseOrderLineDto[];
}
