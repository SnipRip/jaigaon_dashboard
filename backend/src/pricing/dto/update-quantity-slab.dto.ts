import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateQuantitySlabDto } from './create-quantity-slab.dto.js';

export class UpdateQuantitySlabDto extends ArchivableUpdate(
  CreateQuantitySlabDto,
) {}
