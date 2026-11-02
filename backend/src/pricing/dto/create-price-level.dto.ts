import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsDiscountPct } from '../../common/dto/field-validators.js';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';

/** The level's own discount for one category or sub-category. */
export class CategoryDiscountDto {
  @IsUUID()
  categoryId: string;

  @IsDiscountPct()
  discountPct: number;
}

export class CreatePriceLevelDto {
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  name: string;

  @IsDiscountPct()
  discountPct: number;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  /** Sent: replaces the whole list. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CategoryDiscountDto)
  categoryDiscounts?: CategoryDiscountDto[];
}
