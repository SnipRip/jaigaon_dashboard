import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { trim, trimToNull } from '../../common/dto/text-transforms.js';
import { LEDGER_NAME_MESSAGE, LEDGER_NAME_PATTERN } from '../../common/tally/tally-groups.js';
import { GroupNature } from '../../generated/prisma/enums.js';

// Field formats only; how a group fits the tree is ledger-group-rules.ts.
export class CreateLedgerGroupDto {
  @Transform(trim)
  @IsString()
  @Matches(LEDGER_NAME_PATTERN, { message: `Group name: ${LEDGER_NAME_MESSAGE}` })
  name: string;

  /** Null: a primary group (then `nature` is needed). */
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsEnum(GroupNature)
  nature?: GroupNature | null;

  @IsOptional()
  @IsBoolean()
  affectsGrossProfit?: boolean;

  @IsOptional()
  @IsBoolean()
  behavesAsSubLedger?: boolean;

  @IsOptional()
  @IsBoolean()
  nettBalances?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  position?: number;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
