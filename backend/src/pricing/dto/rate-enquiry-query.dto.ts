import { IsOptional, IsUUID } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';

/** `GET /rate-enquiry`: rates for one customer (none = walk-in) on a day (default today in India). */
export class RateEnquiryQueryDto {
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsIsoDate('Date is YYYY-MM-DD')
  date?: string;
}
