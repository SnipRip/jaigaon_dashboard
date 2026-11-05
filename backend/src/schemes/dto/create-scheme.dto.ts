import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsAmount, IsIsoDate, IsQuantity } from '../../common/dto/field-validators.js';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';
import { SchemeBenefit, SchemeLevel, SchemePartyScope, SchemeRateSource } from '../../generated/prisma/enums.js';

/** One item, category / sub-category or brand; scheme-rules.ts checks it is exactly one. */
export class SchemeTargetDto {
  @IsOptional()
  @IsUUID()
  itemId?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  brandId?: string | null;
}

// Field formats only. How the fields go together (an order scheme is a % or
// flat amount, free quantity needs a buy quantity …) is in scheme-rules.ts.
export class CreateSchemeDto {
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  name: string;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @IsEnum(SchemeLevel)
  level: SchemeLevel;

  @IsEnum(SchemeBenefit)
  benefit: SchemeBenefit;

  /** Percent, rupees per unit, rupees, or free units, by benefit. */
  @IsAmount()
  value: number;

  @IsOptional()
  @IsQuantity()
  buyQuantity?: number | null;

  @IsOptional()
  @IsAmount()
  maxDiscount?: number | null;

  @IsOptional()
  @IsQuantity()
  minQuantity?: number | null;

  @IsOptional()
  @IsAmount()
  minValue?: number | null;

  @IsEnum(SchemePartyScope)
  partyScope: SchemePartyScope;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  partyIds?: string[];

  /** Empty: every item. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SchemeTargetDto)
  targets?: SchemeTargetDto[];

  @IsArray()
  @ArrayUnique()
  @IsEnum(SchemeRateSource, { each: true })
  rateSources: SchemeRateSource[];

  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @IsIsoDate('Pick the date the scheme starts')
  validFrom: string;

  @IsOptional()
  @IsIsoDate('Valid till is a date')
  validTill?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}
