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
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { CreatePartyDto } from './dto/create-party.dto.js';
import { ListPartiesQueryDto } from './dto/list-parties-query.dto.js';
import { UpdatePartyDto } from './dto/update-party.dto.js';
import type { PartyView } from './party-view.js';
import { PartiesService } from './parties.service.js';

// Customers and vendors. Reading is open to every signed-in user (every
// document picks a party). Changes need the Customers and / or Vendors
// permission, checked in the service because it depends on the party.
@Controller('parties')
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Get()
  list(@Query() query: ListPartiesQueryDto): Promise<PartyView[]> {
    return this.parties.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PartyView> {
    return this.parties.get(id);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreatePartyDto,
  ): Promise<PartyView> {
    return this.parties.create(auth, dto);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartyDto,
  ): Promise<PartyView> {
    return this.parties.update(auth, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.parties.remove(auth, id);
  }
}
