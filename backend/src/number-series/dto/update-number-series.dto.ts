import { Transform } from 'class-transformer';
import { IsEnum, IsInt, Matches, Max, Min, ValidateIf } from 'class-validator';
import { FINANCIAL_YEAR_PATTERN } from '../../common/financial-year.js';
import { code, trim } from '../../common/dto/text-transforms.js';
import { SeriesDocument } from '../../generated/prisma/enums.js';
import {
  FINANCIAL_YEAR_MESSAGE,
  MAX_NEXT_NUMBER,
  PREFIX_MESSAGE,
  PREFIX_PATTERN,
} from './create-number-series.dto.js';

// Send what changed. Unlike PartialType, a null is refused, not skipped:
// every column is required.
const sent = (_: object, value: unknown) => value !== undefined;

export class UpdateNumberSeriesDto {
  @ValidateIf(sent)
  @IsEnum(SeriesDocument, { message: 'Pick the document' })
  document?: SeriesDocument;

  @Transform(trim)
  @ValidateIf(sent)
  @Matches(FINANCIAL_YEAR_PATTERN, { message: FINANCIAL_YEAR_MESSAGE })
  financialYear?: string;

  @Transform(code)
  @ValidateIf(sent)
  @Matches(PREFIX_PATTERN, { message: PREFIX_MESSAGE })
  prefix?: string;

  @ValidateIf(sent)
  @IsInt()
  @Min(1)
  @Max(MAX_NEXT_NUMBER)
  nextNumber?: number;

  @ValidateIf(sent)
  @IsInt()
  @Min(1)
  @Max(8)
  padding?: number;
}
