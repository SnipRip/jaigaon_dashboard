import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateItemDto } from './create-item.dto.js';

// Sending alternateUnits or openingStock replaces the whole list.
export class UpdateItemDto extends ArchivableUpdate(CreateItemDto) {}
