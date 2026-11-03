import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsString, Length, Max, Min } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { code } from '../../common/dto/text-transforms.js';
import { NumberReset } from '../../generated/prisma/enums.js';

export const MAX_START_NUMBER = 99_999_999;

// Field formats only. Whether the pattern suits the kind is checked in
// number-pattern.ts; the dates against issued numbers in the service.
export class CreateNumberFormatDto {
  @IsIsoDate('Pick the date the format starts')
  applicableFrom: string;

  /** Upper-cased: GST numbers are upper case, and so are the tokens. */
  @Transform(code)
  @IsString()
  @Length(1, 60, { message: 'The pattern is 1 to 60 characters' })
  pattern: string;

  @IsInt({ message: 'The starting number is a whole number' })
  @Min(1)
  @Max(MAX_START_NUMBER)
  startNumber: number;

  @IsEnum(NumberReset, { message: 'Pick when the number restarts' })
  reset: NumberReset;
}
