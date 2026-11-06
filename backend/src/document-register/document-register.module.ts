import { Module } from '@nestjs/common';
import { DocumentRegisterController } from './document-register.controller.js';
import { DocumentRegisterService } from './document-register.service.js';

// The export documents register (SOW 12): every document number on invoices,
// vendor bills and shipments, and the papers still missing. Read-only.
@Module({
  controllers: [DocumentRegisterController],
  providers: [DocumentRegisterService],
  exports: [DocumentRegisterService],
})
export class DocumentRegisterModule {}
