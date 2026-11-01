import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { IsGstRate, IsHsn } from '../../common/dto/field-validators.js';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';

// One DTO for both levels: with parentId it is a sub-category. Blank
// defaults inherit (a sub-category from its category).
export class CreateItemCategoryDto {
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsHsn()
  hsn?: string | null;

  @IsOptional()
  @IsGstRate()
  gstRatePct?: number | null;

  @IsOptional()
  @IsUUID()
  defaultUnitId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
