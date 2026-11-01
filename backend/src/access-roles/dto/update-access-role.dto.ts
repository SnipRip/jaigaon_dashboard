import { PartialType } from '@nestjs/mapped-types';
import { CreateAccessRoleDto } from './create-access-role.dto.js';

export class UpdateAccessRoleDto extends PartialType(CreateAccessRoleDto) {}
