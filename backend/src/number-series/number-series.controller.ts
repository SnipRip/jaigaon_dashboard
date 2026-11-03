import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { CreateNumberFormatDto } from './dto/create-number-format.dto.js';
import {
  IssuedNumbersQueryDto,
  NumberPreviewQueryDto,
  NumberSeriesListQueryDto,
} from './dto/number-series-query.dto.js';
import { UpdateNumberFormatDto } from './dto/update-number-format.dto.js';
import { UpdateNumberSeriesDto } from './dto/update-number-series.dto.js';
import type {
  IssuedNumberView,
  NumberSeriesView,
} from './number-series-view.js';
import { NumberSeriesService } from './number-series.service.js';

const MODULE = '/masters/number-series';

// One series per kind exists from the migration, so there is no create or
// delete of a series: the client changes its method and Tally voucher type,
// and adds formats. Reading is open to every signed-in user: document forms
// show the number a save will take. Numbers are given out only by the
// documents' own services (NumberSeriesService.issue), never through a route.
@Controller('number-series')
export class NumberSeriesController {
  constructor(private readonly series: NumberSeriesService) {}

  @Get()
  list(@Query() query: NumberSeriesListQueryDto): Promise<NumberSeriesView[]> {
    return this.series.list(query.date, query.configured);
  }

  @Get('preview')
  preview(@Query() query: NumberPreviewQueryDto) {
    return this.series.preview(query.kind, query.date);
  }

  @Get(':id/issued')
  issued(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: IssuedNumbersQueryDto,
  ): Promise<IssuedNumberView[]> {
    return this.series.issued(id, query.financialYear);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNumberSeriesDto,
  ): Promise<NumberSeriesView> {
    return this.series.update(id, dto);
  }

  @RequireAccess(MODULE, 'create')
  @Post(':id/formats')
  addFormat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNumberFormatDto,
  ): Promise<NumberSeriesView> {
    return this.series.addFormat(id, dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id/formats/:formatId')
  updateFormat(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('formatId', ParseUUIDPipe) formatId: string,
    @Body() dto: UpdateNumberFormatDto,
  ): Promise<NumberSeriesView> {
    return this.series.updateFormat(id, formatId, dto);
  }

  @RequireAccess(MODULE, 'delete')
  @Delete(':id/formats/:formatId')
  removeFormat(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('formatId', ParseUUIDPipe) formatId: string,
  ): Promise<NumberSeriesView> {
    return this.series.removeFormat(id, formatId);
  }
}
