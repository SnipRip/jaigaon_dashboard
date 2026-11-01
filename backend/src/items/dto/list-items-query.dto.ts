import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../common/dto/field-validators.js';

export class ListItemsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;
}
