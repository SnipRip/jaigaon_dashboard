import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { AdminOnly } from '../common/decorators/require-access.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { ResetStaffPasswordDto } from './dto/reset-staff-password.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import type { StaffMember } from './staff-member.js';
import { StaffService } from './staff.service.js';

// Managing other people's accounts. Administrators only.
@AdminOnly()
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list(): Promise<StaffMember[]> {
    return this.staff.list();
  }

  @Post()
  create(@Body() dto: CreateStaffDto): Promise<StaffMember> {
    return this.staff.create(dto);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffMember> {
    return this.staff.update(auth, id, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetStaffPasswordDto,
  ): Promise<StaffMember> {
    return this.staff.resetPassword(id, dto.temporaryPassword);
  }
}
