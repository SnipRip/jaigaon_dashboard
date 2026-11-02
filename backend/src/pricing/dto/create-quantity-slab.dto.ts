import { IsOptional, IsUUID } from 'class-validator';
import {
  IsDiscountPct,
  IsQuantity,
} from '../../common/dto/field-validators.js';

export class CreateQuantitySlabDto {
  @IsOptional()
  @IsUUID()
  itemId?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  /** In the item's base unit. */
  @IsQuantity()
  minQuantity: number;

  @IsDiscountPct()
  discountPct: number;
}
