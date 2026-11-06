import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import { ListQueryDto } from '../common/dto/field-validators.js';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto.js';
import type { VehicleView } from './vehicle-view.js';
import { VehiclesService } from './vehicles.service.js';

export const VEHICLES_MODULE = '/masters/vehicles';

// Reading is open to every signed-in user (the shipment form picks from it).
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<VehicleView[]> {
    return this.vehicles.list(query.includeArchived);
  }

  @RequireAccess(VEHICLES_MODULE, 'create')
  @Post()
  create(@Body() dto: CreateVehicleDto): Promise<VehicleView> {
    return this.vehicles.create(dto);
  }

  @RequireAccess(VEHICLES_MODULE, 'edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto): Promise<VehicleView> {
    return this.vehicles.update(id, dto);
  }

  @RequireAccess(VEHICLES_MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehicles.remove(id);
  }
}
