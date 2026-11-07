import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsAmount, IsDiscountPct, IsGstRate, IsIsoDate, IsQuantity } from '../../common/dto/field-validators.js';
import { codeOrNull, trim, trimToNull } from '../../common/dto/text-transforms.js';
import { LandedCostMethod, PurchaseBillKind } from '../../generated/prisma/enums.js';
import { MAX_LINE_ITEMS } from '../../pricing/dto/line-rate-options.dto.js';

export class PurchaseBillLineDto {
  @IsUUID()
  itemId: string;

  /** The order line this delivery fills, when the bill is against an order. */
  @IsOptional()
  @IsUUID()
  orderLineId?: string | null;

  /** One of the item's units (symbol), as on the vendor's bill; left out = the base unit. */
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string | null;

  /** In `unit`. */
  @IsQuantity()
  quantity: number;

  /** Per `unit`. */
  @IsAmount()
  rate: number;

  @IsOptional()
  @IsDiscountPct()
  discountPct?: number;

  /** As printed on the vendor's bill. */
  @IsGstRate()
  gstRatePct: number;

  /** False: Section 17(5) or the like; the GST becomes cost. */
  @IsOptional()
  @IsBoolean()
  itcEligible?: boolean;
}

export class PurchaseBillChargeDto {
  @IsUUID()
  headId: string;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  description?: string | null;

  @IsAmount()
  amount: number;

  /** Charges bills: the rate printed. Goods bills take the bill's own rate. */
  @IsOptional()
  @IsGstRate()
  gstRatePct?: number;
}

// Field formats only. Which fields each kind takes, the vendor, order,
// godown and tags are checked in purchase-bills.service.ts.
export class CreatePurchaseBillDto {
  @IsEnum(PurchaseBillKind)
  kind: PurchaseBillKind;

  @IsUUID()
  vendorId: string;

  @Transform(trim)
  @IsString()
  @Length(1, 30)
  vendorBillNumber: string;

  @IsIsoDate('Pick the bill date')
  date: string;

  /** Left out: from the vendor's credit days (45 at most for MSME vendors). */
  @IsOptional()
  @IsIsoDate('Due date is a date')
  dueDate?: string;

  /** GST state code; left out: the vendor's. */
  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'Source of supply is a GST state code' })
  sourceOfSupply?: string | null;

  @IsOptional()
  @IsUUID()
  godownId?: string | null;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string | null;

  @IsOptional()
  @IsEnum(LandedCostMethod)
  allocation?: LandedCostMethod;

  @IsOptional()
  @IsUUID()
  landedCostForId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(/^\d{12}$/, { message: 'An e-way bill number is 12 digits' })
  ewayBillNumber?: string | null;

  @IsOptional()
  @IsIsoDate('E-way bill date is a date')
  ewayBillDate?: string | null;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/, { message: 'Vehicle number looks like WB73E1234' })
  vehicleNumber?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => PurchaseBillLineDto)
  lines?: PurchaseBillLineDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PurchaseBillChargeDto)
  charges?: PurchaseBillChargeDto[];
}

export class BillAllocationDto {
  @IsEnum(LandedCostMethod)
  allocation: LandedCostMethod;
}

export class ListPurchaseBillsQueryDto {
  @IsOptional()
  @IsEnum(PurchaseBillKind)
  kind?: PurchaseBillKind;

  @IsOptional()
  @IsUUID()
  vendorId?: string;
}

/** `?vendorId=&itemIds=a,b`: the rate last paid for each item. */
export class LastPurchaseRatesQueryDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @IsUUID('all', { each: true })
  itemIds: string[];
}
