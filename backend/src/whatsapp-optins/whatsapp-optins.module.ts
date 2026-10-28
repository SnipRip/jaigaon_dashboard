import { Module } from '@nestjs/common';
import { WebsiteApiKeyGuard } from '../common/guards/website-api-key.guard.js';
import { WhatsappOptInsController } from './whatsapp-optins.controller.js';
import { WhatsappOptInsService } from './whatsapp-optins.service.js';

@Module({
  controllers: [WhatsappOptInsController],
  providers: [WhatsappOptInsService, WebsiteApiKeyGuard],
})
export class WhatsappOptInsModule {}
