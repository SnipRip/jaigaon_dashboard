import { IsIn, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/dto/field-validators.js';

export class ListPartiesQueryDto extends ListQueryDto {
  /** Only customers, or only vendors; both when left out. */
  @IsOptional()
  @IsIn(['customer', 'vendor'])
  role?: 'customer' | 'vendor';
}
