import { Module } from '@nestjs/common';
import { AccountHeadsModule } from '../account-heads/account-heads.module.js';
import { BankCashAccountsModule } from '../bank-cash-accounts/bank-cash-accounts.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { GodownsModule } from '../godowns/godowns.module.js';
import { HsnCodesModule } from '../hsn-codes/hsn-codes.module.js';
import { ItemsModule } from '../items/items.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { LoansModule } from '../loans/loans.module.js';
import { PartiesModule } from '../parties/parties.module.js';
import { PriceListModule } from '../price-list/price-list.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { UnitsModule } from '../units/units.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { ImporterRegistry } from './importer-registry.js';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';

// Excel download and import for every master (resumable jobs).
@Module({
  imports: [
    UnitsModule,
    BrandsModule,
    GodownsModule,
    BankCashAccountsModule,
    AccountHeadsModule,
    PartiesModule,
    HsnCodesModule,
    ItemsModule,
    PricingModule,
    PriceListModule,
    LoansModule,
    LedgersModule,
    VehiclesModule,
  ],
  controllers: [ImportsController],
  providers: [ImporterRegistry, ImportsService],
})
export class ImportsModule {}
