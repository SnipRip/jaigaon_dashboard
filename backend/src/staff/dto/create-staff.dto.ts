import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_RULE_MESSAGE,
} from '../../auth/password-policy.js';
import { IsPhone } from '../../common/dto/field-validators.js';
import { lowerCaseEmail, trim, trimToNull } from '../../common/dto/text-transforms.js';
import { Role } from '../../generated/prisma/enums.js';

// An administrator creates the account with a temporary password; the person
// must replace it at first sign-in.
export class CreateStaffDto {
  @Transform(lowerCaseEmail)
  @IsEmail({}, { message: 'Enter a valid email' })
  @MaxLength(254)
  email: string;

  @Transform(trim)
  @IsString()
  @Length(2, 80)
  fullName: string;

  @Transform(trim)
  @IsString()
  @Length(2, 80)
  displayName: string;

  @Transform(trimToNull)
  @IsOptional()
  @IsPhone()
  phone?: string | null;

  @IsEnum(Role)
  role: Role;

  // Staff need an access role; administrators have none.
  @ValidateIf((dto: CreateStaffDto) => dto.role === Role.STAFF || dto.accessRoleId != null)
  @IsUUID('all', { message: 'Pick an access role' })
  accessRoleId?: string | null;

  /** Can sign in; true when left out. Disabling signs the person out everywhere. */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_RULE_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULE_MESSAGE })
  temporaryPassword: string;
}
