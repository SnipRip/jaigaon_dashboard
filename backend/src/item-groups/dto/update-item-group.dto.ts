import { OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateItemGroupDto, VariantDto } from './create-item-group.dto.js';

/** A variant row on save: with `id` it is an existing item, otherwise a new one. */
export class GroupVariantDto extends VariantDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}

// Placement is fixed once variants exist. Attributes may change only so far
// as every active variant still fits them (options can be added; an option
// in use cannot be removed).
export class UpdateItemGroupDto extends ArchivableUpdate(
  OmitType(CreateItemGroupDto, ['categoryId', 'subCategoryId', 'variants'] as const),
) {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => GroupVariantDto)
  variants?: GroupVariantDto[];
}
