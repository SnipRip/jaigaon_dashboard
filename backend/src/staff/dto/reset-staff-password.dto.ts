import { PickType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto.js';

export class ResetStaffPasswordDto extends PickType(CreateStaffDto, [
  'temporaryPassword',
] as const) {}
