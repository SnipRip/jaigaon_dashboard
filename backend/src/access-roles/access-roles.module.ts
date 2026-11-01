import { Module } from '@nestjs/common';
import { AccessRolesController } from './access-roles.controller.js';
import { AccessRolesService } from './access-roles.service.js';

@Module({
  controllers: [AccessRolesController],
  providers: [AccessRolesService],
})
export class AccessRolesModule {}
