import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Email and role are not here on purpose: only an administrator changes them.
export class UpdateProfileDto {
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  fullName: string;

  @Transform(trim)
  @IsString()
  @Length(2, 80)
  displayName: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? null : trim({ value }),
  )
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Phone must include the country code, for example +919635312988',
  })
  phone: string | null;
}
