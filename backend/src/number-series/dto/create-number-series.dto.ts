import { Transform } from 'class-transformer';
import { IsEnum, IsInt, Matches, Max, Min } from 'class-validator';
import { FINANCIAL_YEAR_PATTERN } from '../../common/financial-year.js';
import { code, trim } from '../../common/dto/text-transforms.js';
import { SeriesDocument } from '../../generated/prisma/enums.js';

export const PREFIX_PATTERN = /^[A-Z0-9/-]{1,12}$/;
export const PREFIX_MESSAGE = 'The prefix is up to 12 letters, digits, / and -, like INV/2627/';
export const FINANCIAL_YEAR_MESSAGE = 'The financial year is like 2026-27';
export const MAX_NEXT_NUMBER = 99_999_999;

// Field formats only. Whether the year is consecutive and the number fits in
// 16 characters is checked in number-series-rules.ts.
export class CreateNumberSeriesDto {
  @IsEnum(SeriesDocument, { message: 'Pick the document' })
  document: SeriesDocument;

  @Transform(trim)
  @Matches(FINANCIAL_YEAR_PATTERN, { message: FINANCIAL_YEAR_MESSAGE })
  financialYear: string;

  @Transform(code)
  @Matches(PREFIX_PATTERN, { message: PREFIX_MESSAGE })
  prefix: string;

  @IsInt()
  @Min(1)
  @Max(MAX_NEXT_NUMBER)
  nextNumber: number;

  @IsInt()
  @Min(1)
  @Max(8)
  padding: number;
}
