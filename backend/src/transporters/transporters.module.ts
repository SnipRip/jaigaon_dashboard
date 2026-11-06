import { Module } from '@nestjs/common';
import { TransportersController } from './transporters.controller.js';
import { TransportersService } from './transporters.service.js';

// Transporters master (masters-plan.md row 8): a view of transport vendors.
@Module({
  controllers: [TransportersController],
  providers: [TransportersService],
})
export class TransportersModule {}
