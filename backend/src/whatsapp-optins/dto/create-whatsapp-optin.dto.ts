import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateWhatsappOptInDto {
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  name: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  businessName?: string;

  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'phone must be in E.164 format' })
  phone: string;

  // The exact wording the person agreed to, kept as proof of consent.
  @IsString()
  @Length(20, 1000)
  consentText: string;

  @IsString()
  @Length(1, 20)
  consentVersion: string;

  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  userAgent?: string;
}
