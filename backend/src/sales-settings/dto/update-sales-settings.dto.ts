import { IsBoolean, IsOptional } from 'class-validator';

// Send only what changed.
export class UpdateSalesSettingsDto {
  @IsOptional()
  @IsBoolean()
  invoiceInStockOnly?: boolean;
}
