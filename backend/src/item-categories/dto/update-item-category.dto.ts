import { OmitType } from '@nestjs/mapped-types';
import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateItemCategoryDto } from './create-item-category.dto.js';

// The level is fixed once created: a category stays a category.
export class UpdateItemCategoryDto extends ArchivableUpdate(
  OmitType(CreateItemCategoryDto, ['parentId'] as const),
) {}
