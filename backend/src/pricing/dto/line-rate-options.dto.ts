import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsOptional, IsUUID } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';

/** The items on one quotation or invoice: one call for the whole document. */
export const MAX_LINE_ITEMS = 200;

export class LineRateOptionsDto {
  /** No party is a walk-in buyer: no special rates. */
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsIsoDate('Date is YYYY-MM-DD')
  date?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  itemIds: string[];

  /** A quotation being revised: its own lines are not "last quoted". */
  @IsOptional()
  @IsUUID()
  excludeQuotationId?: string;
}
