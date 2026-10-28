import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { UserProfile } from './user-profile.js';
import { UsersService } from './users.service.js';

// Routes for the signed-in user's own account. Admin user management will
// live in its own controller.
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getProfile(@CurrentAuth() auth: AuthContext): Promise<UserProfile> {
    return this.users.getProfile(auth.userId);
  }

  @Patch()
  updateProfile(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.users.updateProfile(auth.userId, dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.users.changePassword(auth, dto);
  }
}
