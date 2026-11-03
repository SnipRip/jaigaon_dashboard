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
import type { AccountHeadView } from './account-head-view.js';
import { AccountHeadsService } from './account-heads.service.js';
import { CreateAccountHeadDto } from './dto/create-account-head.dto.js';
import { UpdateAccountHeadDto } from './dto/update-account-head.dto.js';

const MODULE = '/masters/expense-heads';

// Reading is open to every signed-in user (expense, bill and receipt pickers).
@Controller('account-heads')
export class AccountHeadsController {
  constructor(private readonly heads: AccountHeadsService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<AccountHeadView[]> {
    return this.heads.list(query.includeArchived);
  }

  @RequireAccess(MODULE, 'create')
  @Post()
  create(@Body() dto: CreateAccountHeadDto): Promise<AccountHeadView> {
    return this.heads.create(dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAccountHeadDto): Promise<AccountHeadView> {
    return this.heads.update(id, dto);
  }

  @RequireAccess(MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.heads.remove(id);
  }
}
