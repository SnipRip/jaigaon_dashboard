import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { trim } from '../../common/dto/text-transforms.js';

export class CreateAccessRoleDto {
  @Transform(trim)
  @IsString()
  @Length(2, 40)
  name: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  // Module href → actions. Checked in depth by parsePermissions.
  @IsObject()
  permissions: Record<string, unknown>;
}
