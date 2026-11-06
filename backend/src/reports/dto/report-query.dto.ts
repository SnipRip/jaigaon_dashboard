import { IsOptional } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';

export class ReportQueryDto {
  /** Defaults to 1 April of the financial year `to` falls in. Ignored by stock and outstanding. */
  @IsOptional()
  @IsIsoDate('Pick the first day')
  from?: string;

  /** Defaults to today in India. */
  @IsOptional()
  @IsIsoDate('Pick the last day')
  to?: string;
}
