import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateLedgerDto } from './create-ledger.dto.js';

/** Send what changed; null clears the tax kind and notes. */
export class UpdateLedgerDto extends ArchivableUpdate(CreateLedgerDto) {}
