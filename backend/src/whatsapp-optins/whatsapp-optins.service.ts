import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateWhatsappOptInDto } from './dto/create-whatsapp-optin.dto.js';

const WEBSITE_SOURCE = 'website-form';

@Injectable()
export class WhatsappOptInsService {
  constructor(private readonly prisma: PrismaService) {}

  // Signing up again with the same number renews consent and clears any
  // earlier opt-out, so there is always one current record per number.
  async record(dto: CreateWhatsappOptInDto): Promise<void> {
    const consent = {
      name: dto.name,
      businessName: dto.businessName ?? null,
      consentText: dto.consentText,
      consentVersion: dto.consentVersion,
      source: WEBSITE_SOURCE,
      ipAddress: dto.ipAddress ?? null,
      userAgent: dto.userAgent ?? null,
    };
    await this.prisma.whatsappOptIn.upsert({
      where: { phoneE164: dto.phone },
      create: { phoneE164: dto.phone, ...consent },
      update: { ...consent, optedInAt: new Date(), optedOutAt: null },
    });
  }
}
