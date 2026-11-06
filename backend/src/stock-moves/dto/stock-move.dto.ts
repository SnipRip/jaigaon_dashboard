import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { codeOrNull, trim, trimToNull } from '../../common/dto/text-transforms.js';
import { StockAdjustmentDirection, StockAdjustmentReason } from '../../generated/prisma/enums.js';
import { MAX_LINE_ITEMS } from '../../pricing/dto/line-rate-options.dto.js';

// Field formats only; the services check the godowns, the items, the reason
// against the direction and the stock itself.

class StockMoveLineDto {
  @IsUUID()
  itemId: string;

  /** In the item's base unit. */
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Quantity has at most 3 decimals' })
  @Min(0.001, { message: 'Quantity must be more than 0' })
  @Max(99_999_999)
  quantity: number;
}

class AdjustmentLineDto extends StockMoveLineDto {
  /** Stock added only: its cost per base unit. Ignored when stock is taken out (it costs what its batches cost). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'Rate has at most 4 decimals' })
  @Min(0)
  @Max(99_999_999)
  rate?: number | null;
}

class StockMoveFieldsDto {
  @IsIsoDate('Pick the date')
  date: string;

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

export class StockTransferDto extends StockMoveFieldsDto {
  @IsUUID()
  fromGodownId: string;

  @IsUUID()
  toGodownId: string;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/, { message: 'Vehicle number looks like WB73E1234' })
  vehicleNumber?: string | null;

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one item' })
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => StockMoveLineDto)
  lines: StockMoveLineDto[];
}

export class StockAdjustmentDto extends StockMoveFieldsDto {
  @IsUUID()
  godownId: string;

  @IsEnum(StockAdjustmentDirection)
  direction: StockAdjustmentDirection;

  @IsEnum(StockAdjustmentReason)
  reason: StockAdjustmentReason;

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one item' })
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => AdjustmentLineDto)
  lines: AdjustmentLineDto[];
}

export class CancelStockMoveDto {
  @Transform(trim)
  @IsString()
  @Length(2, 200)
  reason: string;
}
