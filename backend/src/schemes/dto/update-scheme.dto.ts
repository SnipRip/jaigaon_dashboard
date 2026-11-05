import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateSchemeDto } from './create-scheme.dto.js';

export class UpdateSchemeDto extends ArchivableUpdate(CreateSchemeDto) {}
