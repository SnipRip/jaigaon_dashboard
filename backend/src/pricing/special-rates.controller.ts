import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { CreateSpecialRateDto } from './dto/create-special-rate.dto.js';
import { ListSpecialRatesQueryDto } from './dto/list-special-rates-query.dto.js';
import { UpdateSpecialRateDto } from './dto/update-special-rate.dto.js';
import { SpecialRatesService } from './special-rates.service.js';
import { RATES_MODULE } from './pricing-module-key.js';
import type { SpecialRateView } from './pricing-views.js';

// Customer special rates (`?partyId=` for one customer). Reading is open to
// every signed-in user; changes need the Rates permission.
@Controller('special-rates')
export class SpecialRatesController {
  constructor(private readonly rates: SpecialRatesService) {}

  @Get()
  list(@Query() query: ListSpecialRatesQueryDto): Promise<SpecialRateView[]> {
    return this.rates.list(query);
  }

  @RequireAccess(RATES_MODULE, 'create')
  @Post()
  create(@Body() dto: CreateSpecialRateDto): Promise<SpecialRateView> {
    return this.rates.create(dto);
  }

  @RequireAccess(RATES_MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpecialRateDto,
  ): Promise<SpecialRateView> {
    return this.rates.update(id, dto);
  }

  @RequireAccess(RATES_MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.rates.remove(id);
  }
}
