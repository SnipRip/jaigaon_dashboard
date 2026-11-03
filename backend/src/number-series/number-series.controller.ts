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
} from '@nestjs/common';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { CreateNumberSeriesDto } from './dto/create-number-series.dto.js';
import { UpdateNumberSeriesDto } from './dto/update-number-series.dto.js';
import type { NumberSeriesView } from './number-series-view.js';
import { NumberSeriesService } from './number-series.service.js';

const MODULE = '/masters/number-series';

// Reading is open to every signed-in user: document forms show the number
// the next save will take. Numbers themselves are claimed by the documents'
// own services (NumberSeriesService.claimNext), never through a route.
@Controller('number-series')
export class NumberSeriesController {
  constructor(private readonly series: NumberSeriesService) {}

  @Get()
  list(): Promise<NumberSeriesView[]> {
    return this.series.list();
  }

  @RequireAccess(MODULE, 'create')
  @Post()
  create(@Body() dto: CreateNumberSeriesDto): Promise<NumberSeriesView> {
    return this.series.create(dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNumberSeriesDto,
  ): Promise<NumberSeriesView> {
    return this.series.update(id, dto);
  }

  @RequireAccess(MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.series.remove(id);
  }
}
