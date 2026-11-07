import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsPhone } from '../../common/dto/field-validators.js';
import {
  codeOrNull,
  trim,
  trimToNull,
} from '../../common/dto/text-transforms.js';
import {
  ExportRoute,
  GstRegistration,
  PartyCurrency,
} from '../../generated/prisma/enums.js';

// Field formats only. How GSTIN, PAN and state fit together is checked in
// company-profile-rules.ts. Every field is optional: send what changed.
export class UpdateCompanyProfileDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(2, 120)
  legalName?: string;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tradeName?: string | null;

  @IsOptional()
  @IsEnum(GstRegistration)
  registration?: GstRegistration;

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

  @Transform(trim)
  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'State is a two-digit GST state code' })
  stateCode?: string;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(/^[A-Z0-9]{10}$/, {
    message: 'The IEC has 10 letters and digits',
  })
  iec?: string | null;

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
  @IsString()
  @MaxLength(60)
  district?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'PIN code is 6 digits' })
  pin?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsPhone()
  phone?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsPhone()
  altPhone?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email' })
  @MaxLength(254)
  email?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  exportBank?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  customsStation?: string | null;

  @Transform(codeOrNull)
  @IsOptional()
  @Matches(/^[A-Z0-9]{6}$/, {
    message: 'Port codes have 6 letters and digits, like INJIGB',
  })
  portCode?: string | null;

  @IsOptional()
  @IsEnum(ExportRoute)
  defaultExportRoute?: ExportRoute;

  @IsOptional()
  @IsEnum(PartyCurrency)
  exportCurrency?: PartyCurrency;
}
