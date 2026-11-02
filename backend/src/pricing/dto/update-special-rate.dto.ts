import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateSpecialRateDto } from './create-special-rate.dto.js';

export class UpdateSpecialRateDto extends ArchivableUpdate(
  CreateSpecialRateDto,
) {}
