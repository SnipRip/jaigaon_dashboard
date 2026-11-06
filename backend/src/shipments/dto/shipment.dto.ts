import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsIsoDate } from '../../common/dto/field-validators.js';
import { codeOrNull, trim, trimToNull } from '../../common/dto/text-transforms.js';
import { ShipmentStage } from '../../generated/prisma/enums.js';
import { normaliseVehicle, VEHICLE_PATTERN } from '../shipment-rules.js';

// Field formats only; shipments.service.ts checks the buyer, the invoices,
// the transporter and the stage.
export class ShipmentDto {
  /** Loading date. */
  @IsIsoDate('Pick the loading date')
  date: string;

  /** The buyer: every invoice on the truck is theirs. */
  @IsUUID()
  partyId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Pick at least one export invoice' })
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  invoiceIds: string[];

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? normaliseVehicle(value) : value))
  @IsString()
  @Matches(VEHICLE_PATTERN, { message: 'Vehicle number like WB73E1234 or BG2A1234' })
  vehicleNumber: string;

  /** A transport vendor on record; none for our own truck. */
  @IsOptional()
  @IsUUID()
  transporterId?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  driverName?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @Matches(/^\+?\d{8,13}$/, { message: "Driver's phone is 8 to 13 digits" })
  driverPhone?: string | null;

  @Transform(trim)
  @IsString()
  @Length(1, 60, { message: 'Where in Bhutan is it going?' })
  destination: string;

  @Transform(trim)
  @IsString()
  @Length(1, 80, { message: 'Enter the border point' })
  borderPoint: string;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  customsAgent?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  sealNumber?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999_999)
  packages?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999_999_999)
  grossWeightKg?: number | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;

  /** Create only: typed when the series allows it; blank takes the next number. */
  @Transform(codeOrNull)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  number?: string | null;
}

/** Move to the next stage. `stage` is the stage the person saw as next, so a double click never moves two steps. */
export class ShipmentStageDto {
  @IsEnum(ShipmentStage)
  stage: ShipmentStage;

  @IsIsoDate('Pick the date')
  date: string;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  note?: string | null;
}

export class CancelShipmentDto {
  @Transform(trim)
  @IsString()
  @Length(2, 200)
  reason: string;
}

export class LinkExpensesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Pick the expenses to link' })
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  expenseIds: string[];
}

export class ShipmentQueryDto {
  @IsOptional()
  @IsUUID()
  partyId?: string;
}
