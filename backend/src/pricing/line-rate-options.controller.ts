import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LineRateOptionsDto } from './dto/line-rate-options.dto.js';
import { LineRateOptionsService, type LineRateOptionsView } from './line-rate-options.service.js';

// "What rates can this line take?" Open to every signed-in user, like the
// rate sheet it reads. A POST only because a document sends many items.
@Controller('rates')
export class LineRateOptionsController {
  constructor(private readonly options: LineRateOptionsService) {}

  @HttpCode(HttpStatus.OK)
  @Post('line-options')
  lineOptions(@Body() dto: LineRateOptionsDto): Promise<LineRateOptionsView[]> {
    return this.options.forLines(dto);
  }
}
