import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateBrandDto } from './create-brand.dto.js';

export class UpdateBrandDto extends ArchivableUpdate(CreateBrandDto) {}
