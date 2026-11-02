import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreatePriceLevelDto } from './create-price-level.dto.js';

export class UpdatePriceLevelDto extends ArchivableUpdate(
  CreatePriceLevelDto,
) {}
