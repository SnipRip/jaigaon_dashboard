import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';

export class CreateBrandDto {
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  name: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsBoolean()
  isAuthorised: boolean;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}
