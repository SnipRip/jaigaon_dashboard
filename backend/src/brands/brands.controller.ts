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
import { BrandsService, type BrandView } from './brands.service.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';

const MODULE = '/masters/brands';

// Reading is open to every signed-in user (item pickers and search).
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<BrandView[]> {
    return this.brands.list(query.includeArchived);
  }

  @RequireAccess(MODULE, 'create')
  @Post()
  create(@Body() dto: CreateBrandDto): Promise<BrandView> {
    return this.brands.create(dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandDto): Promise<BrandView> {
    return this.brands.update(id, dto);
  }

  @RequireAccess(MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.brands.remove(id);
  }
}
