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
import { ListQueryDto } from '../common/dto/field-validators.js';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { UpdateUnitDto } from './dto/update-unit.dto.js';
import { UnitsService, type UnitView } from './units.service.js';

const MODULE = '/masters/units';

// Reading is open to every signed-in user: every item and document picker
// needs the list. Changes need the Units permission.
@Controller('units')
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<UnitView[]> {
    return this.units.list(query.includeArchived);
  }

  @RequireAccess(MODULE, 'create')
  @Post()
  create(@Body() dto: CreateUnitDto): Promise<UnitView> {
    return this.units.create(dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto): Promise<UnitView> {
    return this.units.update(id, dto);
  }

  @RequireAccess(MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.units.remove(id);
  }
}
