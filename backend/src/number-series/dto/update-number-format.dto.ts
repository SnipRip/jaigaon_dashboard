import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { code } from '../../common/dto/text-transforms.js';
import { NumberReset } from '../../generated/prisma/enums.js';
import { MAX_START_NUMBER } from './create-number-format.dto.js';

// Send what changed. Unlike PartialType, a null is refused: every column is
// required. Only a format that has issued no number can change.
const sent = (_: object, value: unknown) => value !== undefined;

export class UpdateNumberFormatDto {
  @ValidateIf(sent)
  @IsIsoDate('Pick the date the format starts')
  applicableFrom?: string;

  @Transform(code)
  @ValidateIf(sent)
  @IsString()
  @Length(1, 60, { message: 'The pattern is 1 to 60 characters' })
  pattern?: string;

  @ValidateIf(sent)
  @IsInt({ message: 'The starting number is a whole number' })
  @Min(1)
  @Max(MAX_START_NUMBER)
  startNumber?: number;

  @ValidateIf(sent)
  @IsEnum(NumberReset, { message: 'Pick when the number restarts' })
  reset?: NumberReset;
}
