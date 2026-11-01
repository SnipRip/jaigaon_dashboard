import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto.js';

// Every field optional. The password is reset through its own route.
export class UpdateStaffDto extends PartialType(
  OmitType(CreateStaffDto, ['temporaryPassword'] as const),
) {}
