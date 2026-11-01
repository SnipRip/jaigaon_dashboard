import { IsOptional, IsPositive, IsUUID } from 'class-validator';
import { IsAmount, IsQuantity } from '../../common/dto/field-validators.js';

// The repeated rows inside an item: alternate units and opening stock.

/** "1 bundle = 25 kg": one of `unitId` holds `baseQuantity` base units. */
export class AlternateUnitDto {
  @IsUUID()
  unitId: string;

  @IsQuantity(4)
  @IsPositive()
  baseQuantity: number;
}

export class OpeningStockDto {
  @IsUUID()
  godownId: string;

  @IsQuantity()
  quantity: number;

  /** At cost; quantity × cost price when left out. */
  @IsOptional()
  @IsAmount()
  value?: number | null;
}
