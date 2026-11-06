import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountHeadsService } from '../account-heads/account-heads.service.js';
import { BankCashAccountsService } from '../bank-cash-accounts/bank-cash-accounts.service.js';
import { BrandsService } from '../brands/brands.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { GodownsService } from '../godowns/godowns.service.js';
import { HsnCodesService } from '../hsn-codes/hsn-codes.service.js';
import { ItemsService } from '../items/items.service.js';
import { LedgersService } from '../ledgers/ledgers.service.js';
import { LoansService } from '../loans/loans.service.js';
import { PartiesService } from '../parties/parties.service.js';
import { PriceListService } from '../price-list/price-list.service.js';
import { SpecialRatesService } from '../pricing/special-rates.service.js';
import { UnitsService } from '../units/units.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { hsnImporter, itemsImporter } from './importers/catalog.importers.js';
import { ledgersImporter } from './importers/ledgers.importer.js';
import { loansImporter } from './importers/loans.importer.js';
import { customersImporter, vendorsImporter } from './importers/parties.importers.js';
import { priceListImporter } from './importers/price-list.importer.js';
import { specialRatesImporter } from './importers/pricing.importers.js';
import {
  accountHeadsImporter,
  bankCashImporter,
  brandsImporter,
  godownsImporter,
  unitsImporter,
} from './importers/simple-masters.importers.js';
import { vehiclesImporter } from './importers/vehicles.importer.js';
import type { MasterImporter } from './master-importer.js';

// Every master that can be filled from a sheet, by its URL key. Staff
// accounts are left out on purpose: they carry passwords and roles.
@Injectable()
export class ImporterRegistry {
  private readonly importers: Map<string, MasterImporter>;

  constructor(
    prisma: PrismaService,
    units: UnitsService,
    brands: BrandsService,
    godowns: GodownsService,
    accounts: BankCashAccountsService,
    heads: AccountHeadsService,
    parties: PartiesService,
    hsn: HsnCodesService,
    items: ItemsService,
    rates: SpecialRatesService,
    priceList: PriceListService,
    loans: LoansService,
    ledgers: LedgersService,
    vehicles: VehiclesService,
  ) {
    const all = [
      unitsImporter(units, prisma),
      brandsImporter(brands, prisma),
      godownsImporter(godowns, prisma),
      bankCashImporter(accounts, prisma),
      accountHeadsImporter(heads, prisma),
      customersImporter(parties, prisma),
      vendorsImporter(parties, prisma),
      hsnImporter(hsn, prisma),
      itemsImporter(items, prisma),
      specialRatesImporter(rates, prisma),
      priceListImporter(priceList, prisma),
      loansImporter(loans, prisma),
      ledgersImporter(ledgers, prisma),
      vehiclesImporter(vehicles, prisma),
    ] as unknown as MasterImporter[];
    this.importers = new Map(all.map((importer) => [importer.key, importer]));
  }

  get(key: string): MasterImporter {
    const importer = this.importers.get(key);
    if (!importer) throw new NotFoundException(`Nothing to import called "${key}"`);
    return importer;
  }
}
