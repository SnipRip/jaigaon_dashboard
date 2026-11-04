import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  IsAmount,
  IsGstRate,
  IsHsn,
  IsQuantity,
  ITEM_HSN_PATTERN,
} from '../../common/dto/field-validators.js';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';
import { AlternateUnitDto, OpeningStockDto } from './item-line.dto.js';

export const SKU_PATTERN = /^[A-Za-z0-9-]+$/;
export const SKU_MESSAGE = 'SKU uses letters, digits and dashes only';

// Fields left out inherit from the group, sub-category or category
// (GST rate, unit). HSN is always the item's own.
export class CreateItemDto {
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Length(2, 40)
  @Matches(SKU_PATTERN, { message: SKU_MESSAGE })
  sku: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  subCategoryId?: string | null;

  @IsOptional()
  @IsUUID()
  groupId?: string | null;

  /** Attribute name → option, required for an item in a group. */
  @IsOptional()
  @IsObject()
  attributeValues?: Record<string, string> | null;

  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @Transform(trim)
  @IsHsn(ITEM_HSN_PATTERN)
  hsn: string;

  @IsOptional()
  @IsGstRate()
  gstRatePct?: number | null;

  /** Base unit; inherited when left out. */
  @IsOptional()
  @IsUUID()
  unitId?: string | null;

  @IsOptional()
  @IsQuantity()
  weightKg?: number | null;

  @IsOptional()
  @IsAmount()
  mrp?: number | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  preferredSupplier?: string | null;

  @IsOptional()
  @IsQuantity()
  reorderLevel?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AlternateUnitDto)
  alternateUnits?: AlternateUnitDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OpeningStockDto)
  openingStock?: OpeningStockDto[];
}
