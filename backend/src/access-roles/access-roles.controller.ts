import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AdminOnly } from '../common/decorators/require-access.decorator.js';
import { AccessRolesService, type AccessRoleView } from './access-roles.service.js';
import { CreateAccessRoleDto } from './dto/create-access-role.dto.js';
import { UpdateAccessRoleDto } from './dto/update-access-role.dto.js';

// Access roles and their module permissions. Administrators only.
@AdminOnly()
@Controller('access-roles')
export class AccessRolesController {
  constructor(private readonly roles: AccessRolesService) {}

  @Get()
  list(): Promise<AccessRoleView[]> {
    return this.roles.list();
  }

  @Post()
  create(@Body() dto: CreateAccessRoleDto): Promise<AccessRoleView> {
    return this.roles.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccessRoleDto,
  ): Promise<AccessRoleView> {
    return this.roles.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.roles.remove(id);
  }
}
