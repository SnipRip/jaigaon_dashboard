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
import { CreateHsnCodeDto } from './dto/create-hsn-code.dto.js';
import { HsnLookupQueryDto } from './dto/hsn-lookup-query.dto.js';
import { HsnRateDto } from './dto/hsn-rate.dto.js';
import { UpdateHsnCodeDto } from './dto/update-hsn-code.dto.js';
import type { HsnCodeView } from './hsn-code-view.js';
import { HsnCodesService, type HsnLookup } from './hsn-codes.service.js';

const MODULE = '/masters/hsn';

// Reading is open to every signed-in user: items and documents take their
// GST rate from here. Changes need the HSN permission.
@Controller('hsn-codes')
export class HsnCodesController {
  constructor(private readonly codes: HsnCodesService) {}

  @Get()
  list(): Promise<HsnCodeView[]> {
    return this.codes.list();
  }

  /** `?hsn=72142090&date=2026-11-02`: the code it falls under and the rate that day. */
  @Get('lookup')
  lookup(@Query() query: HsnLookupQueryDto): Promise<HsnLookup | null> {
    return this.codes.lookup(query.hsn, query.date);
  }

  @RequireAccess(MODULE, 'create')
  @Post()
  create(@Body() dto: CreateHsnCodeDto): Promise<HsnCodeView> {
    return this.codes.create(dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHsnCodeDto,
  ): Promise<HsnCodeView> {
    return this.codes.update(id, dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Post(':id/rates')
  @HttpCode(HttpStatus.OK)
  addRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HsnRateDto,
  ): Promise<HsnCodeView> {
    return this.codes.addRate(id, dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Delete(':id/rates/:rateId')
  removeRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rateId', ParseUUIDPipe) rateId: string,
  ): Promise<HsnCodeView> {
    return this.codes.removeRate(id, rateId);
  }

  @RequireAccess(MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.codes.remove(id);
  }
}
