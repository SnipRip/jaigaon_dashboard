import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { MAX_BULK_ROWS } from './bulk-item-prices.dto.js';

// The price-list prices in force on one day, set again for another day or
// range ("same as yesterday").
export class CopyItemPricesDto {
  @IsIsoDate('Pick the day to copy from')
  fromDate: string;

  @IsIsoDate('Pick the day to copy to')
  validFrom: string;

  /** Left out or null: that day only. */
  @IsOptional()
  @IsIsoDate('Valid till is a date')
  validTill?: string | null;

  /** Only these items; left out: every item with a price that day. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_BULK_ROWS)
  @IsUUID('all', { each: true })
  itemIds?: string[];
}
