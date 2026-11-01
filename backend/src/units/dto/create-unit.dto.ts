import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';
import { trim } from '../../common/dto/text-transforms.js';
import { UnitKind } from '../../generated/prisma/enums.js';

export class CreateUnitDto {
  @Transform(trim)
  @IsString()
  @Length(1, 12)
  symbol: string;

  @Transform(trim)
  @IsString()
  @Length(2, 40)
  name: string;

  @IsEnum(UnitKind)
  kind: UnitKind;

  @IsInt()
  @Min(0)
  @Max(3)
  decimals: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{3}$/, { message: 'The GST unit code (UQC) is three letters, for example KGS' })
  uqc: string;
}
