import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreatePartyDto } from './create-party.dto.js';

export class UpdatePartyDto extends ArchivableUpdate(CreatePartyDto) {}
