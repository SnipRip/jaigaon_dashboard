import { OmitType } from '@nestjs/mapped-types';
import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { CreateItemPriceDto } from './create-item-price.dto.js';

/** An entry stays on its item; send only what changed. */
export class UpdateItemPriceDto extends ArchivableUpdate(
  OmitType(CreateItemPriceDto, ['itemId'] as const),
) {}
