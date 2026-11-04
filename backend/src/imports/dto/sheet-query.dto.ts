import { IsOptional } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';

/** `?date=2026-11-04`: the sheet to fill in for that day (price list). */
export class SheetQueryDto {
  @IsOptional()
  @IsIsoDate('Date is YYYY-MM-DD')
  date?: string;
}
