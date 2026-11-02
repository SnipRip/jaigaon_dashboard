import { Controller, Get, Query } from '@nestjs/common';
import { RateQuoteQueryDto } from './dto/rate-quote-query.dto.js';
import { RateQuoteService, type RateQuoteView } from './rate-quote.service.js';

// "What rate does this customer get?" Open to every signed-in user, like
// the item prices it is worked out from.
@Controller('rates')
export class RateQuoteController {
  constructor(private readonly quotes: RateQuoteService) {}

  /** `?itemId=&partyId=&quantity=&date=` */
  @Get('quote')
  quote(@Query() query: RateQuoteQueryDto): Promise<RateQuoteView> {
    return this.quotes.quote(query);
  }
}
