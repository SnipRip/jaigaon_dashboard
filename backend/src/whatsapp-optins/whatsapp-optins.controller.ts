import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator.js';
import { WebsiteApiKeyGuard } from '../common/guards/website-api-key.guard.js';
import { CreateWhatsappOptInDto } from './dto/create-whatsapp-optin.dto.js';
import { WhatsappOptInsService } from './whatsapp-optins.service.js';

// Called by the public website's server, never by a browser: no session,
// but the shared API key is required.
@Controller('public/whatsapp-optins')
export class WhatsappOptInsController {
  constructor(private readonly optIns: WhatsappOptInsService) {}

  @Public()
  @UseGuards(WebsiteApiKeyGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  create(@Body() dto: CreateWhatsappOptInDto): Promise<void> {
    return this.optIns.record(dto);
  }
}
