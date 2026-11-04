import { IsOptional } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';

/** `?date=2026-11-04`; left out: today in India. */
export class PriceSheetQueryDto {
  @IsOptional()
  @IsIsoDate('Date is YYYY-MM-DD')
  date?: string;
}
