import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { ArchivableUpdate } from '../../common/dto/archivable.js';
import { trimToNull } from '../../common/dto/text-transforms.js';
import { DRIVER_PHONE_MESSAGE, DRIVER_PHONE_PATTERN, VEHICLE_MESSAGE, VEHICLE_PATTERN, vehicleTransform } from '../../common/vehicle-number.js';
import { VehicleOwnership, VehicleType } from '../../generated/prisma/enums.js';

// Field formats; vehicles.service.ts checks the transporter is a live vendor
// and that our own vehicle has none (vehicle-rules.ts).
export class CreateVehicleDto {
  @Transform(vehicleTransform)
  @IsString()
  @Matches(VEHICLE_PATTERN, { message: VEHICLE_MESSAGE })
  number: string;

  @IsEnum(VehicleType)
  type: VehicleType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Capacity in tons, one decimal' })
  @Min(0.1)
  @Max(99999)
  capacityTons?: number | null;

  @IsEnum(VehicleOwnership)
  ownership: VehicleOwnership;

  /** A transport vendor; hired vehicles only. */
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
  @Matches(DRIVER_PHONE_PATTERN, { message: DRIVER_PHONE_MESSAGE })
  driverPhone?: string | null;

  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

/** Send what changed. */
export class UpdateVehicleDto extends ArchivableUpdate(CreateVehicleDto) {}
