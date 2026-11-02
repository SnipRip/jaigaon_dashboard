import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsAmount, IsIsoDate } from '../../common/dto/field-validators.js';
import { trimToNull } from '../../common/dto/text-transforms.js';
import { SpecialRateKind } from '../../generated/prisma/enums.js';

// Field formats only. One target, the value's range, the dates and overlaps
// with other rates are checked in pricing-rules.ts.
export class CreateSpecialRateDto {
  @IsUUID()
  partyId: string;

  @IsOptional()
  @IsUUID()
  itemId?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsEnum(SpecialRateKind)
  kind: SpecialRateKind;

  /** Rupees per base unit for NET, percent off MRP for DISCOUNT. */
  @IsAmount()
  value: number;

  @IsIsoDate('Pick the date the rate starts')
  validFrom: string;

  /** Left out or null: until withdrawn. */
  @IsOptional()
  @IsIsoDate('Valid till is a date')
  validTill?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}
