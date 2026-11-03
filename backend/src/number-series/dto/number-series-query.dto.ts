import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, Matches } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { FINANCIAL_YEAR_PATTERN } from '../../common/financial-year.js';
import { NumberedKind } from '../../generated/prisma/enums.js';

/** `GET /number-series?date=&configured=true`. */
export class NumberSeriesListQueryDto {
  /** The viewer's today: picks the format in force and the year counted. Defaults to the server's. */
  @IsOptional()
  @IsIsoDate('The date is YYYY-MM-DD')
  date?: string;

  /** Only kinds with a format (for the All masters count). */
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsOptional()
  @IsBoolean()
  configured?: boolean;
}

/** `GET /number-series/preview?kind=&date=`: the number a save on that date would take. */
export class NumberPreviewQueryDto {
  @IsEnum(NumberedKind, { message: 'Unknown kind' })
  kind: NumberedKind;

  @IsIsoDate('The date is YYYY-MM-DD')
  date: string;
}

/** `GET /number-series/:id/issued?financialYear=2026-27`. */
export class IssuedNumbersQueryDto {
  @IsOptional()
  @Matches(FINANCIAL_YEAR_PATTERN, {
    message: 'The financial year is like 2026-27',
  })
  financialYear?: string;
}
