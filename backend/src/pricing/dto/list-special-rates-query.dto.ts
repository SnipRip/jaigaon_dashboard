import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../common/dto/field-validators.js';

export class ListSpecialRatesQueryDto extends ListQueryDto {
  /** One customer's rates only. */
  @IsOptional()
  @IsUUID()
  partyId?: string;
}
