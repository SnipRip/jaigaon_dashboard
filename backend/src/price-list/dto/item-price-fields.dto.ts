import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsAmount } from '../../common/dto/field-validators.js';
import { trimToNull } from '../../common/dto/text-transforms.js';

// The figures of one price, shared by a single save, a bulk row and an
// import row. Give the price, or a margin to work it out from the cost.
// The ranges and the price order are checked in price-list-rules.ts.
export class ItemPriceFieldsDto {
  /** Rupees per base unit. Left out: worked out from `marginPct`. */
  @IsOptional()
  @IsAmount()
  sellingPrice?: number;

  /** Margin on the price, used only when the price is left out. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  marginPct?: number;

  /** Null: the item master's. */
  @IsOptional()
  @IsAmount()
  mrp?: number | null;

  @IsOptional()
  @IsAmount()
  minSellingPrice?: number | null;

  /** The day's cost, for the margin. Null: the item master's. */
  @IsOptional()
  @IsAmount()
  costPrice?: number | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}
