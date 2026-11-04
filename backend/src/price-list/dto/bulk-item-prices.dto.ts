import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { ItemPriceFieldsDto } from './item-price-fields.dto.js';

/** At most this many rows in one save; a larger list goes through Excel import. */
export const MAX_BULK_ROWS = 5000;

export class BulkItemPriceRowDto extends ItemPriceFieldsDto {
  @IsUUID()
  itemId: string;
}

// Many prices for the same dates, saved together or not at all.
export class BulkItemPricesDto {
  @IsIsoDate('Pick the date the prices start')
  validFrom: string;

  /** Left out or null: that day only. */
  @IsOptional()
  @IsIsoDate('Valid till is a date')
  validTill?: string | null;

  @IsArray()
  @ArrayMinSize(1, { message: 'Change at least one price' })
  @ArrayMaxSize(MAX_BULK_ROWS, {
    message: `Save at most ${MAX_BULK_ROWS} prices at once; import the rest from Excel`,
  })
  @ValidateNested({ each: true })
  @Type(() => BulkItemPriceRowDto)
  rows: BulkItemPriceRowDto[];
}
