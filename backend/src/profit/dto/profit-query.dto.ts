import { IsOptional } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';

/** The period sales are counted in: by invoice date (overheads by their own date). */
export class ProfitQueryDto {
  /** Defaults to 1 April of the financial year `to` falls in. */
  @IsOptional()
  @IsIsoDate('Pick the first day')
  from?: string;

  /** Defaults to today in India. */
  @IsOptional()
  @IsIsoDate('Pick the last day')
  to?: string;
}
