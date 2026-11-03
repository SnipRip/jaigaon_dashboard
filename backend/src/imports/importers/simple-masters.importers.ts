// Importers for the small masters: units, brands, godowns, bank & cash,
// expense & income heads. Each row goes through the master's own DTO and
// service.
import { HEAD_GROUPS } from '../../account-heads/account-head-rules.js';
import type { AccountHeadsService } from '../../account-heads/account-heads.service.js';
import { CreateAccountHeadDto } from '../../account-heads/dto/create-account-head.dto.js';
import { UpdateAccountHeadDto } from '../../account-heads/dto/update-account-head.dto.js';
import type { BankCashAccountsService } from '../../bank-cash-accounts/bank-cash-accounts.service.js';
import { CreateBankCashAccountDto } from '../../bank-cash-accounts/dto/create-bank-cash-account.dto.js';
import { UpdateBankCashAccountDto } from '../../bank-cash-accounts/dto/update-bank-cash-account.dto.js';
import type { BrandsService } from '../../brands/brands.service.js';
import { CreateBrandDto } from '../../brands/dto/create-brand.dto.js';
import { UpdateBrandDto } from '../../brands/dto/update-brand.dto.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AccountHead, BankCashAccount, Brand, Godown, Unit } from '../../generated/prisma/client.js';
import { CreateGodownDto } from '../../godowns/dto/create-godown.dto.js';
import { UpdateGodownDto } from '../../godowns/dto/update-godown.dto.js';
import type { GodownsService } from '../../godowns/godowns.service.js';
import { CreateUnitDto } from '../../units/dto/create-unit.dto.js';
import { UpdateUnitDto } from '../../units/dto/update-unit.dto.js';
import type { UnitsService } from '../../units/units.service.js';
import { toNumber } from '../../common/decimal.js';
import type { ImportColumn } from '../import-cells.js';
import { dateCell } from '../import-workbook.js';
import { pick, sameText, validDto, type MasterImporter } from '../master-importer.js';

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');
const fieldsOf = <V>(columns: ImportColumn<V>[]) => columns.map((column) => column.field);
const label = (choices: Record<string, string>, value: string | null) => (value ? (choices[value] ?? value) : null);

const UNIT_KINDS = { COUNT: 'Count', WEIGHT: 'Weight', VOLUME: 'Volume', LENGTH: 'Length', AREA: 'Area' };

export function unitsImporter(units: UnitsService, prisma: PrismaService): MasterImporter<Unit> {
  const columns: ImportColumn<Unit>[] = [
    { header: 'Symbol', field: 'symbol', kind: 'text', required: true, hint: 'As printed on documents: kg, pcs, bag.', value: (unit) => unit.symbol },
    { header: 'Name', field: 'name', kind: 'text', required: true, value: (unit) => unit.name },
    { header: 'Kind', field: 'kind', kind: 'choice', choices: UNIT_KINDS, required: true, value: (unit) => label(UNIT_KINDS, unit.kind) },
    { header: 'Decimals', field: 'decimals', kind: 'number', required: true, hint: 'Decimals allowed in quantities, 0 to 3.', value: (unit) => unit.decimals },
    { header: 'UQC', field: 'uqc', kind: 'text', required: true, hint: 'GST unit code for e-way bills: KGS, NOS, BAG…', value: (unit) => unit.uqc },
  ];
  return {
    key: 'units',
    title: 'units',
    module: '/masters/units',
    columns,
    refs: [],
    archivable: true,
    list: () => units.list(true),
    findExisting: async (values) =>
      values.symbol ? ((await prisma.unit.findFirst({ where: { symbol: sameText(values.symbol) } }))?.id ?? null) : null,
    create: async (values) => (await units.create(await validDto(CreateUnitDto, pick(values, fieldsOf(columns))))).id,
    update: async (id, values) => void (await units.update(id, await validDto(UpdateUnitDto, values))),
  };
}

export function brandsImporter(brands: BrandsService, prisma: PrismaService): MasterImporter<Brand> {
  const columns: ImportColumn<Brand>[] = [
    { header: 'Name', field: 'name', kind: 'text', required: true, value: (brand) => brand.name },
    { header: 'Main category', field: 'categoryId', kind: 'ref', ref: 'category', hint: 'Category the brand mostly sells in.', value: (brand, refs) => refs.nameOf('category', brand.categoryId) },
    { header: 'Authorised dealer', field: 'isAuthorised', kind: 'yesno', value: (brand) => yesNo(brand.isAuthorised) },
    { header: 'Notes', field: 'notes', kind: 'text', value: (brand) => brand.notes },
  ];
  return {
    key: 'brands',
    title: 'brands',
    module: '/masters/brands',
    columns,
    refs: ['category'],
    archivable: true,
    list: () => brands.list(true),
    findExisting: async (values) =>
      values.name ? ((await prisma.brand.findFirst({ where: { name: sameText(values.name) } }))?.id ?? null) : null,
    create: async (values) => (await brands.create(await validDto(CreateBrandDto, pick(values, fieldsOf(columns))))).id,
    update: async (id, values) => void (await brands.update(id, await validDto(UpdateBrandDto, values))),
  };
}

const GODOWN_KINDS = { STORE: 'Store', YARD: 'Yard', SITE: 'Site' };

export function godownsImporter(godowns: GodownsService, prisma: PrismaService): MasterImporter<Godown> {
  const columns: ImportColumn<Godown>[] = [
    { header: 'Name', field: 'name', kind: 'text', required: true, value: (godown) => godown.name },
    { header: 'Address', field: 'address', kind: 'text', required: true, value: (godown) => godown.address },
    { header: 'Kind', field: 'kind', kind: 'choice', choices: GODOWN_KINDS, required: true, value: (godown) => label(GODOWN_KINDS, godown.kind) },
    { header: 'Default godown', field: 'isDefault', kind: 'yesno', hint: 'Only one: the last row marked Yes wins.', value: (godown) => yesNo(godown.isDefault) },
    { header: 'In charge', field: 'inCharge', kind: 'text', value: (godown) => godown.inCharge },
    { header: 'Phone', field: 'phone', kind: 'text', value: (godown) => godown.phone },
  ];
  return {
    key: 'godowns',
    title: 'godowns',
    module: '/masters/godowns',
    columns,
    refs: [],
    archivable: true,
    list: () => godowns.list(true),
    findExisting: async (values) =>
      values.name ? ((await prisma.godown.findFirst({ where: { name: sameText(values.name) } }))?.id ?? null) : null,
    create: async (values) => (await godowns.create(await validDto(CreateGodownDto, pick(values, fieldsOf(columns))))).id,
    update: async (id, values) => void (await godowns.update(id, await validDto(UpdateGodownDto, values))),
  };
}

const MONEY_KINDS = { BANK: 'Bank account', OVERDRAFT: 'Overdraft / cash credit', CASH: 'Cash' };

export function bankCashImporter(accounts: BankCashAccountsService, prisma: PrismaService): MasterImporter<BankCashAccount> {
  const columns: ImportColumn<BankCashAccount>[] = [
    { header: 'Account name', field: 'name', kind: 'text', required: true, value: (account) => account.name },
    { header: 'Kind', field: 'kind', kind: 'choice', choices: MONEY_KINDS, required: true, value: (account) => label(MONEY_KINDS, account.kind) },
    { header: 'Bank', field: 'bankName', kind: 'text', hint: 'Bank and overdraft accounts only.', value: (account) => account.bankName },
    { header: 'Branch', field: 'branch', kind: 'text', value: (account) => account.branch },
    { header: 'Account number', field: 'accountNumber', kind: 'text', value: (account) => account.accountNumber },
    { header: 'IFSC', field: 'ifsc', kind: 'text', value: (account) => account.ifsc },
    { header: 'UPI ID', field: 'upiId', kind: 'text', value: (account) => account.upiId },
    { header: 'Opening balance', field: 'openingBalance', kind: 'number', required: true, hint: 'Below zero only for an overdraft: the amount drawn.', value: (account) => toNumber(account.openingBalance) },
    { header: 'Balance as of', field: 'openingDate', kind: 'date', required: true, value: (account) => dateCell(account.openingDate.toISOString().slice(0, 10)) },
    { header: 'Bank details on invoices', field: 'showOnInvoice', kind: 'yesno', hint: 'Only one account prints.', value: (account) => yesNo(account.showOnInvoice) },
    { header: 'Tally ledger name', field: 'tallyLedgerName', kind: 'text', hint: 'Blank: the account name.', value: (account) => account.tallyLedgerName },
  ];
  return {
    key: 'bank-cash',
    title: 'bank and cash accounts',
    module: '/masters/bank-cash',
    columns,
    refs: [],
    archivable: true,
    list: () => prisma.bankCashAccount.findMany({ orderBy: [{ kind: 'asc' }, { name: 'asc' }] }),
    findExisting: async (values) =>
      values.name ? ((await prisma.bankCashAccount.findFirst({ where: { name: sameText(values.name) } }))?.id ?? null) : null,
    create: async (values) =>
      (await accounts.create(await validDto(CreateBankCashAccountDto, pick(values, fieldsOf(columns))))).id,
    update: async (id, values) => void (await accounts.update(id, await validDto(UpdateBankCashAccountDto, values))),
  };
}

const NATURES = {
  DIRECT_EXPENSE: HEAD_GROUPS.DIRECT_EXPENSE,
  INDIRECT_EXPENSE: HEAD_GROUPS.INDIRECT_EXPENSE,
  DIRECT_INCOME: HEAD_GROUPS.DIRECT_INCOME,
  INDIRECT_INCOME: HEAD_GROUPS.INDIRECT_INCOME,
};
const HEAD_GST = { FOLLOWS_BILL: "Follows the bill's rate", OWN_RATE: 'Its own rate', NONE: 'No GST' };
const ALLOCATIONS = { ITEM_COST: 'Item cost (landed cost)', INVOICE: 'One invoice', SHIPMENT: 'One shipment', OVERHEAD: 'General overhead' };

export function accountHeadsImporter(heads: AccountHeadsService, prisma: PrismaService): MasterImporter<AccountHead> {
  const columns: ImportColumn<AccountHead>[] = [
    { header: 'Head name', field: 'name', kind: 'text', required: true, hint: 'The Tally ledger name.', value: (head) => head.name },
    { header: 'Tally group', field: 'nature', kind: 'choice', choices: NATURES, required: true, value: (head) => NATURES[head.nature] },
    { header: 'GST', field: 'gst', kind: 'choice', choices: HEAD_GST, hint: 'Expense heads only.', value: (head) => label(HEAD_GST, head.gst) },
    { header: 'GST rate %', field: 'gstRatePct', kind: 'number', hint: 'Own rate only: 5, 12, 18, 28 or 40.', value: (head) => toNumber(head.gstRatePct) },
    { header: 'Cost lands on', field: 'allocation', kind: 'choice', choices: ALLOCATIONS, hint: 'Expense heads only; an indirect expense is a general overhead.', value: (head) => label(ALLOCATIONS, head.allocation) },
    { header: 'Notes', field: 'notes', kind: 'text', value: (head) => head.notes },
  ];
  return {
    key: 'account-heads',
    title: 'expense and income heads',
    module: '/masters/expense-heads',
    columns,
    refs: [],
    archivable: true,
    list: () => prisma.accountHead.findMany({ orderBy: [{ nature: 'asc' }, { name: 'asc' }] }),
    findExisting: async (values) =>
      values.name ? ((await prisma.accountHead.findFirst({ where: { name: sameText(values.name) } }))?.id ?? null) : null,
    create: async (values) => (await heads.create(await validDto(CreateAccountHeadDto, pick(values, fieldsOf(columns))))).id,
    update: async (id, values) => void (await heads.update(id, await validDto(UpdateAccountHeadDto, values))),
  };
}
