import { Controller, Get, Query } from '@nestjs/common';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { RateEnquiryQueryDto } from './dto/rate-enquiry-query.dto.js';
import type { RateEnquiryView } from './rate-enquiry-views.js';
import { RateEnquiryService } from './rate-enquiry.service.js';

export const RATE_ENQUIRY_MODULE = '/rate-enquiry';

// Costs and margins are on every row, so the screen's own permission is needed.
@Controller('rate-enquiry')
export class RateEnquiryController {
  constructor(private readonly enquiry: RateEnquiryService) {}

  @RequireAccess(RATE_ENQUIRY_MODULE, 'view')
  @Get()
  get(@CurrentAuth() auth: AuthContext, @Query() query: RateEnquiryQueryDto): Promise<RateEnquiryView> {
    return this.enquiry.enquiry(auth, query);
  }
}
