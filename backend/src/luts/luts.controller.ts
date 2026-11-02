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
import { CreateLutDto } from './dto/create-lut.dto.js';
import { UpdateLutDto } from './dto/update-lut.dto.js';
import type { LutView } from './lut-view.js';
import { LutsService } from './luts.service.js';

// Kept on the GST & export setup screen, beside the company profile.
const MODULE = '/masters/tax-export';

// Reading is open to every signed-in user: export invoices quote the LUT in
// force on their date.
@Controller('luts')
export class LutsController {
  constructor(private readonly luts: LutsService) {}

  @Get()
  list(): Promise<LutView[]> {
    return this.luts.list();
  }

  @RequireAccess(MODULE, 'create')
  @Post()
  create(@Body() dto: CreateLutDto): Promise<LutView> {
    return this.luts.create(dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLutDto,
  ): Promise<LutView> {
    return this.luts.update(id, dto);
  }

  @RequireAccess(MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.luts.remove(id);
  }
}
