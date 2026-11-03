import { PartialType } from '@nestjs/mapped-types';
import { CreateLedgerGroupDto } from './create-ledger-group.dto.js';

/** Send what changed. Tally's own groups take only the display options and notes. */
export class UpdateLedgerGroupDto extends PartialType(CreateLedgerGroupDto) {}
