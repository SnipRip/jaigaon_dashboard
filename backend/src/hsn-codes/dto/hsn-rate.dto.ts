import { Matches } from 'class-validator';
import { IsGstRate } from '../../common/dto/field-validators.js';

/** A GST rate and the date it applies from. */
export class HsnRateDto {
  @IsGstRate()
  ratePct: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Pick the date the rate applies from',
  })
  effectiveFrom: string;
}
