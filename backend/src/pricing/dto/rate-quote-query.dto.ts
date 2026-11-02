import { Type } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';
import { IsIsoDate, IsQuantity } from '../../common/dto/field-validators.js';

/** `?itemId=&partyId=&quantity=12&date=2026-11-02`; no party is a walk-in buyer. */
export class RateQuoteQueryDto {
  @IsUUID()
  itemId: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @Type(() => Number)
  @IsQuantity()
  quantity: number;

  @IsOptional()
  @IsIsoDate('Date is YYYY-MM-DD')
  date?: string;
}
