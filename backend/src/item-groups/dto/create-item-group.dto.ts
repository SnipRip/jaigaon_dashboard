import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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
import { SKU_MESSAGE, SKU_PATTERN } from '../../items/dto/create-item.dto.js';
import { MAX_GROUP_ATTRIBUTES } from '../../items/item-rules.js';

// Blank becomes null: SKUs and the SKU prefix are optional.
const upperTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() || null : value;

export class GroupAttributeDto {
  @Transform(trim)
  @IsString()
  @Length(1, 30)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  options: string[];
}

/** One generated variant, as edited in the variants table. */
export class VariantDto {
  @IsObject()
  attributeValues: Record<string, string>;

  /** Generated from the group name and values when left out. */
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string | null;

  @Transform(upperTrim)
  @IsOptional()
  @Length(2, 40)
  @Matches(SKU_PATTERN, { message: SKU_MESSAGE })
  sku?: string | null;

  /** The group's (or sub-category's) HSN when left out. */
  @Transform(trimToNull)
  @IsOptional()
  @IsHsn(ITEM_HSN_PATTERN)
  hsn?: string | null;

  /** Put in the default godown. */
  @IsOptional()
  @IsQuantity()
  openingStock?: number | null;

  /** Landed cost per unit of the opening stock; needed with it. */
  @IsOptional()
  @IsAmount()
  openingRate?: number | null;

  @IsOptional()
  @IsQuantity()
  reorderLevel?: number;
}

/** A standalone item brought into the group as one of its variants. */
export class AdoptItemDto {
  @IsUUID()
  itemId: string;

  @IsObject()
  attributeValues: Record<string, string>;
}

// Creating a group creates its variants (items) in the same transaction, as
// the group form does. Later, each variant is edited as an item.
export class CreateItemGroupDto {
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  name: string;

  @Transform(upperTrim)
  @IsOptional()
  @Length(2, 20)
  @Matches(SKU_PATTERN, { message: SKU_MESSAGE })
  skuPrefix?: string | null;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  subCategoryId?: string | null;

  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsHsn()
  hsn?: string | null;

  @IsOptional()
  @IsGstRate()
  gstRatePct?: number | null;

  @IsOptional()
  @IsUUID()
  defaultUnitId?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_GROUP_ATTRIBUTES)
  @ValidateNested({ each: true })
  @Type(() => GroupAttributeDto)
  attributes: GroupAttributeDto[];

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];

  /** Items made one by one before the group existed; they keep their stock, SKU and history. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AdoptItemDto)
  adopt?: AdoptItemDto[];
}
