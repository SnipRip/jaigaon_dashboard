import { Transform } from 'class-transformer';
import { IsOptional, Matches, ValidateIf } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { code, codeOrNull } from '../../common/dto/text-transforms.js';
import {
  AD_CODE_MESSAGE,
  AD_CODE_PATTERN,
  ARN_MESSAGE,
  ARN_PATTERN,
} from './create-lut.dto.js';

// Send what changed. Unlike PartialType, a null ARN or date is refused, not
// skipped: those columns cannot be cleared. Only the AD code can.
const sent = (_: object, value: unknown) => value !== undefined;

export class UpdateLutDto {
  @Transform(code)
  @ValidateIf(sent)
  @Matches(ARN_PATTERN, { message: ARN_MESSAGE })
  arn?: string;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(AD_CODE_PATTERN, { message: AD_CODE_MESSAGE })
  adCode?: string | null;

  @ValidateIf(sent)
  @IsIsoDate('Pick the date the LUT starts')
  validFrom?: string;

  @ValidateIf(sent)
  @IsIsoDate('Pick the date the LUT ends')
  validTo?: string;
}
