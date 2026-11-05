import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsAmount, IsDiscountPct, IsIsoDate, IsQuantity } from '../../common/dto/field-validators.js';
import { SchemeRateSource } from '../../generated/prisma/enums.js';
import { MAX_LINE_ITEMS } from '../../pricing/dto/line-rate-options.dto.js';

export class SchemeLineDto {
  @IsString()
  @MaxLength(60)
  key: string;

  @IsUUID()
  itemId: string;

  @IsQuantity()
  quantity: number;

  @IsAmount()
  rate: number;

  @IsOptional()
  @IsDiscountPct()
  discountPct?: number;

  @IsEnum(SchemeRateSource)
  rateSource: SchemeRateSource;
}

/** A document's lines, to see what schemes take off before it is saved. */
export class EvaluateSchemesDto {
  /** No party: a walk-in buyer in India. */
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsIsoDate('Date is YYYY-MM-DD')
  date?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => SchemeLineDto)
  lines: SchemeLineDto[];
}
