import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateHsnCodeDto } from './create-hsn-code.dto.js';

// The code and kind are fixed once created. Rates change through their own
// routes, so a new rate adds to the history instead of overwriting it.
export class UpdateHsnCodeDto extends PartialType(
  OmitType(CreateHsnCodeDto, [
    'kind',
    'code',
    'ratePct',
    'effectiveFrom',
  ] as const),
) {}
