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
import type { BankCashAccountView } from './bank-cash-account-view.js';
import { BankCashAccountsService } from './bank-cash-accounts.service.js';
import { CreateBankCashAccountDto } from './dto/create-bank-cash-account.dto.js';
import { UpdateBankCashAccountDto } from './dto/update-bank-cash-account.dto.js';

const MODULE = '/masters/bank-cash';

// Reading is open to every signed-in user (receipt, payment and invoice
// pickers).
@Controller('bank-cash-accounts')
export class BankCashAccountsController {
  constructor(private readonly accounts: BankCashAccountsService) {}

  @Get()
  list(@Query() query: ListQueryDto): Promise<BankCashAccountView[]> {
    return this.accounts.list(query.includeArchived);
  }

  @RequireAccess(MODULE, 'create')
  @Post()
  create(@Body() dto: CreateBankCashAccountDto): Promise<BankCashAccountView> {
    return this.accounts.create(dto);
  }

  @RequireAccess(MODULE, 'edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankCashAccountDto,
  ): Promise<BankCashAccountView> {
    return this.accounts.update(id, dto);
  }

  @RequireAccess(MODULE, 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.accounts.remove(id);
  }
}
