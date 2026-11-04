import { IsOptional, IsUUID } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { ItemPriceFieldsDto } from './item-price-fields.dto.js';

export class CreateItemPriceDto extends ItemPriceFieldsDto {
  @IsUUID()
  itemId: string;

  @IsIsoDate('Pick the date the price starts')
  validFrom: string;

  /** Left out or null: that day only. */
  @IsOptional()
  @IsIsoDate('Valid till is a date')
  validTill?: string | null;
}
