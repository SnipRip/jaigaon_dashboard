import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccessRolesModule } from './access-roles/access-roles.module.js';
import { AccountHeadsModule } from './account-heads/account-heads.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BankCashAccountsModule } from './bank-cash-accounts/bank-cash-accounts.module.js';
import { BrandsModule } from './brands/brands.module.js';
import { CompanyProfileModule } from './company-profile/company-profile.module.js';
import { SalesSettingsModule } from './sales-settings/sales-settings.module.js';
import { StockMovesModule } from './stock-moves/stock-moves.module.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { AccessGuard } from './common/guards/access.guard.js';
import { OriginGuard } from './common/guards/origin.guard.js';
import { SessionGuard } from './common/guards/session.guard.js';
import { validateEnv } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { GodownsModule } from './godowns/godowns.module.js';
import { HealthModule } from './health/health.module.js';
import { HsnCodesModule } from './hsn-codes/hsn-codes.module.js';
import { ImportsModule } from './imports/imports.module.js';
import { ItemCategoriesModule } from './item-categories/item-categories.module.js';
import { ItemGroupsModule } from './item-groups/item-groups.module.js';
import { ItemsModule } from './items/items.module.js';
import { LedgersModule } from './ledgers/ledgers.module.js';
import { BooksModule } from './books/books.module.js';
import { LoansModule } from './loans/loans.module.js';
import { LutsModule } from './luts/luts.module.js';
import { NumberSeriesModule } from './number-series/number-series.module.js';
import { PartiesModule } from './parties/parties.module.js';
import { PriceListModule } from './price-list/price-list.module.js';
import { PricingModule } from './pricing/pricing.module.js';
import { SchemesModule } from './schemes/schemes.module.js';
import { PurchasesModule } from './purchases/purchases.module.js';
import { QuotationsModule } from './quotations/quotations.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { ShipmentsModule } from './shipments/shipments.module.js';
import { DocumentRegisterModule } from './document-register/document-register.module.js';
import { ProfitModule } from './profit/profit.module.js';
import { SettlementsModule } from './settlements/settlements.module.js';
import { StaffModule } from './staff/staff.module.js';
import { UnitsModule } from './units/units.module.js';
import { UsersModule } from './users/users.module.js';
import { WhatsappOptInsModule } from './whatsapp-optins/whatsapp-optins.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }] }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    StaffModule,
    AccessRolesModule,
    UnitsModule,
    BrandsModule,
    GodownsModule,
    ItemCategoriesModule,
    ItemGroupsModule,
    ItemsModule,
    HsnCodesModule,
    PartiesModule,
    PricingModule,
    PriceListModule,
    SchemesModule,
    PurchasesModule,
    QuotationsModule,
    InvoicesModule,
    SettlementsModule,
    ExpensesModule,
    ShipmentsModule,
    DocumentRegisterModule,
    ProfitModule,
    StockMovesModule,
    CompanyProfileModule,
    SalesSettingsModule,
    LutsModule,
    NumberSeriesModule,
    BankCashAccountsModule,
    AccountHeadsModule,
    LoansModule,
    LedgersModule,
    BooksModule,
    ImportsModule,
    WhatsappOptInsModule,
    HealthModule,
  ],
  providers: [
    // Global guards run in this order: rate limit, origin check, session,
    // then role and permission checks.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
