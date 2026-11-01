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
import type { Godown } from '../generated/prisma/client.js';
import { CreateGodownDto } from './dto/create-godown.dto.js';
import { UpdateGodownDto } from './dto/update-godown.dto.js';
import { GodownsService } from './godowns.service.js';

const MODULE = '/masters/godowns';

// Reading is open to every signed-in user (stock and document pickers).
@Controller('godowns')
export class GodownsController {
  constructor(private readonly godowns: GodownsService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<Godown[]> {
    return this.godowns.list(query.includeArchived);
  }

  @RequireAccess(MODULE, 'create')
  @Post()
  create(@Body() dto: CreateGodownDto): Promise<Godown> {
    return this.godowns.create(dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGodownDto): Promise<Godown> {
    return this.godowns.update(id, dto);
  }

  @RequireAccess(MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.godowns.remove(id);
  }
}
