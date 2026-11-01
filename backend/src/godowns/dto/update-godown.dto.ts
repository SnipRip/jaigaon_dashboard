import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateGodownDto } from './create-godown.dto.js';

export class UpdateGodownDto extends ArchivableUpdate(CreateGodownDto) {}
