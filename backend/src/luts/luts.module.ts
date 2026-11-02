import { Module } from '@nestjs/common';
import { LutsController } from './luts.controller.js';
import { LutsService } from './luts.service.js';

@Module({
  controllers: [LutsController],
  providers: [LutsService],
})
export class LutsModule {}
