import { IsOptional, Matches } from 'class-validator';

/** `?hsn=72142090&date=2026-11-02` */
export class HsnLookupQueryDto {
  @Matches(/^\d{4,8}$/, { message: 'HSN is 4 to 8 digits' })
  hsn: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date is YYYY-MM-DD' })
  date?: string;
}
