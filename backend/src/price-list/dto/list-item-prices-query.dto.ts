import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../common/dto/field-validators.js';

export class ListItemPricesQueryDto extends ListQueryDto {
  /** One item's entries only. */
  @IsOptional()
  @IsUUID()
  itemId?: string;
}
