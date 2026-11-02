import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsAmount, IsPhone } from '../../common/dto/field-validators.js';
import {
  codeOrNull,
  trim,
  trimToNull,
} from '../../common/dto/text-transforms.js';
import {
  BalanceSide,
  ExportRoute,
  GstTreatment,
  PartyCurrency,
  PartyKind,
} from '../../generated/prisma/enums.js';

// Field formats only. Which fields a GST treatment needs, and how they fit
// together, is checked in party-rules.ts.
export class CreatePartyDto {
  @IsBoolean()
  isCustomer: boolean;

  @IsBoolean()
  isVendor: boolean;

  @IsOptional()
  @IsEnum(PartyKind)
  kind?: PartyKind;

  @Transform(trim)
  @IsString()
  @Length(2, 100)
  displayName: string;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  legalName?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  contactPerson?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsPhone()
  phone?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email' })
  @MaxLength(254)
  email?: string | null;

  @IsEnum(GstTreatment)
  treatment: GstTreatment;

  @Transform(codeOrNull)
  @IsOptional()
  @IsString()
  gstin?: string | null;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(/^[A-Z]{5}\d{4}[A-Z]$/, {
    message: 'PAN is 5 letters, 4 digits, 1 letter',
  })
  pan?: string | null;

  /** GST state code, e.g. "19"; filled from the GSTIN when left out. */
  @Transform(trimToNull)
  @IsOptional()
  @Matches(/^\d{2}$/, {
    message: 'Place of supply is a two-digit GST state code',
  })
  placeOfSupply?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  country?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  foreignTaxId?: string | null;

  @IsOptional()
  @IsEnum(PartyCurrency)
  currency?: PartyCurrency;

  @IsOptional()
  @IsEnum(ExportRoute)
  exportRoute?: ExportRoute | null;

  @IsOptional()
  @IsBoolean()
  isGta?: boolean;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'PIN code is 6 digits' })
  pin?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  creditDays?: number;

  @IsOptional()
  @IsAmount()
  creditLimit?: number | null;

  /** Customers only; cleared for a vendor. */
  @IsOptional()
  @IsUUID()
  priceLevelId?: string | null;

  @IsOptional()
  @IsAmount()
  openingBalance?: number;

  /** Needed only for a party that is both customer and vendor. */
  @IsOptional()
  @IsEnum(BalanceSide)
  openingBalanceSide?: BalanceSide;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, {
    message: 'Udyam number format: UDYAM-WB-00-0000000',
  })
  udyamNumber?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bankName?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(/^\d{9,18}$/, { message: 'Account number is 9 to 18 digits' })
  bankAccountNumber?: string | null;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'IFSC is 11 characters, like SBIN0001234',
  })
  ifsc?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
