import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsObject, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, ValidateNested } from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { codeOrNull, trim, trimToNull } from '../../common/dto/text-transforms.js';
import { ExportRoute, InvoiceKind, PartyCurrency } from '../../generated/prisma/enums.js';
import { MAX_LINE_ITEMS } from '../../pricing/dto/line-rate-options.dto.js';
import { QuotationLineDto } from '../../quotations/dto/quotation.dto.js';

// Field formats only; invoices.service.ts checks the customer against the
// kind, the godown, the LUT and the stock, takes GST and costs from the
// masters and applies the schemes. Lines are the same shape as a quotation's.
export class InvoiceDto {
  @IsEnum(InvoiceKind)
  kind: InvoiceKind;

  @IsUUID()
  partyId: string;

  /** The godown the goods leave from. */
  @IsUUID()
  godownId: string;

  @IsIsoDate('Pick the invoice date')
  date: string;

  /** Typed only when the series allows it; blank takes the next number. */
  @Transform(codeOrNull)
  @IsOptional()
  @IsString()
  @MaxLength(16)
  number?: string | null;

  /** Local invoices: defaults to the customer's state. */
  @Transform(trimToNull)
  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'Place of supply is a two-digit GST state code' })
  placeOfSupply?: string | null;

  /** Export invoices: defaults to the buyer's route. */
  @IsOptional()
  @IsEnum(ExportRoute)
  exportRoute?: ExportRoute | null;

  @IsOptional()
  @IsEnum(PartyCurrency)
  currency?: PartyCurrency;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  shipToLine?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  shipToCity?: string | null;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/, { message: 'Vehicle number looks like WB73E1234' })
  vehicleNumber?: string | null;

  /** Picked from the vehicle master; its number replaces vehicleNumber. None for a truck typed in. */
  @IsOptional()
  @IsUUID()
  vehicleId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;

  /** Converting this quotation: it is marked converted in the same save. */
  @IsOptional()
  @IsUUID()
  quotationId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => QuotationLineDto)
  lines: QuotationLineDto[];
}

export class CancelInvoiceDto {
  @Transform(trim)
  @IsString()
  @Length(2, 200)
  reason: string;
}

/** A dispatch document's number, date and kind-specific fields; dispatch-document-rules.ts checks each kind. */
export class InvoiceDocumentDto {
  @Transform(trim)
  @IsString()
  @Length(1, 64)
  number: string;

  @IsIsoDate('Pick the document date')
  date: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}
