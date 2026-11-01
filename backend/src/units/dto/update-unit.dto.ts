import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateUnitDto } from './create-unit.dto.js';

export class UpdateUnitDto extends ArchivableUpdate(CreateUnitDto) {}
