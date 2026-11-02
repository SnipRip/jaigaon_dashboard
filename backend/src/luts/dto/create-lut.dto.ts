import { Transform } from 'class-transformer';
import { IsOptional, Matches } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { code, codeOrNull } from '../../common/dto/text-transforms.js';

// GST portal ARNs are 15 characters: two letters, then letters and digits.
export const ARN_PATTERN = /^[A-Z]{2}[A-Z0-9]{13}$/;
export const ARN_MESSAGE =
  'The ARN is the 15-character number on the RFD-11 acknowledgement, like AD190426012345X';
export const AD_CODE_PATTERN = /^[A-Z0-9]{4,20}$/;
export const AD_CODE_MESSAGE = 'The AD code is 4 to 20 letters and digits';

// Field formats only. How the dates fit together is checked in lut-rules.ts;
// the financial year is worked out from validFrom.
export class CreateLutDto {
  @Transform(code)
  @Matches(ARN_PATTERN, { message: ARN_MESSAGE })
  arn: string;

  /** Left out or null: not issued yet, added later. */
  @Transform(codeOrNull)
  @IsOptional()
  @Matches(AD_CODE_PATTERN, { message: AD_CODE_MESSAGE })
  adCode?: string | null;

  @IsIsoDate('Pick the date the LUT starts')
  validFrom: string;

  @IsIsoDate('Pick the date the LUT ends')
  validTo: string;
}
