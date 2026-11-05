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
import { ListQueryDto } from '../common/dto/field-validators.js';
import { CreateSchemeDto } from './dto/create-scheme.dto.js';
import { EvaluateSchemesDto } from './dto/evaluate-schemes.dto.js';
import { UpdateSchemeDto } from './dto/update-scheme.dto.js';
import type { SchemeResult } from './scheme-rules.js';
import type { SchemeView } from './scheme-views.js';
import { SCHEMES_MODULE } from './schemes-module-key.js';
import { SchemesService } from './schemes.service.js';

// Schemes and discounts for customers. Reading them and asking what they
// take off a document is open to every signed-in user, like special rates;
// changes need the Schemes permission.
@Controller('schemes')
export class SchemesController {
  constructor(private readonly schemes: SchemesService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<SchemeView[]> {
    return this.schemes.list(query.includeArchived);
  }

  /** A POST only because a document sends many lines. */
  @HttpCode(HttpStatus.OK)
  @Post('evaluate')
  evaluate(@Body() dto: EvaluateSchemesDto): Promise<SchemeResult> {
    return this.schemes.evaluate(dto);
  }

  @RequireAccess(SCHEMES_MODULE, 'create')
  @Post()
  create(@Body() dto: CreateSchemeDto): Promise<SchemeView> {
    return this.schemes.create(dto);
  }

  @RequireAccess(SCHEMES_MODULE, 'edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSchemeDto): Promise<SchemeView> {
    return this.schemes.update(id, dto);
  }

  @RequireAccess(SCHEMES_MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.schemes.remove(id);
  }
}
