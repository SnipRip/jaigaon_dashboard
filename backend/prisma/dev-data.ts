// Development and test data that stays in the local database: godowns,
// brands, HSN codes, items (no opening stock: stock comes in through purchase
// bills), vendors, customers, this week's price list, special rates and
// schemes, a bank account and a cash book, number formats and a test LUT.
// Not for production. Run after `npm run db:seed` with
// `npm run db:dev-data`. Safe to re-run: records are matched by name / SKU /
// code and left as they are, and the price list gets entries for the week
// of the day it runs, so running it on a later day gives that day rates.
// Names start with real-looking businesses; GSTINs carry a valid check
// character but are made up.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { gstinCheckChar } from '../src/common/gst/gstin.js';
import { PrismaClient, type GstTreatment, type Prisma } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const addDays = (iso: string, days: number) => new Date(day(iso).getTime() + days * 86_400_000).toISOString().slice(0, 10);
/** Monday of this week. */
const weekStart = addDays(today, -((day(today).getUTCDay() + 6) % 7));

const gstin = (state: string, pan: string) => `${state}${pan}1Z${gstinCheckChar(`${state}${pan}1Z`)}`;

const GODOWNS = [
  { name: 'Jaigaon main store', address: 'M.G. Road, Jaigaon 736182', kind: 'STORE' as const, isDefault: true },
  { name: 'Jaigaon yard', address: 'NH 317A, Jaigaon 736182', kind: 'YARD' as const, isDefault: false },
];

const BRANDS = ['Hind TMT', 'Tata Tiscon', 'Magicrete', 'Tata Bluescope', 'Greenply'];

// Indicative test rates, not for real bills.
const HSN = [
  { code: '7214', description: 'Bars and rods of iron or non-alloy steel (TMT)', ratePct: 18 },
  { code: '7306', description: 'Tubes, pipes and hollow profiles of iron or steel', ratePct: 18 },
  { code: '7217', description: 'Wire of iron or non-alloy steel (binding wire)', ratePct: 18 },
  { code: '7317', description: 'Nails, tacks and similar articles of iron or steel', ratePct: 18 },
  { code: '6810', description: 'Articles of cement or concrete (AAC blocks)', ratePct: 18 },
  { code: '6901', description: 'Bricks of siliceous earth; building bricks', ratePct: 12 },
  { code: '7210', description: 'Flat-rolled products of iron or steel, coated (roofing sheets)', ratePct: 18 },
  { code: '4412', description: 'Plywood, veneered panels and similar laminated wood', ratePct: 18 },
];

interface ItemSeed {
  sku: string;
  name: string;
  category: string;
  subCategory: string;
  brand?: string;
  hsn: string;
  unit: string;
  weightKg?: number;
  mrp?: number;
  reorderLevel: number;
  /** This week's selling rate and minimum, per base unit. */
  rate: number;
  min: number;
}

const ITEMS: ItemSeed[] = [
  { sku: 'TMT-8-HIND', name: 'TMT bar 8 mm Fe 550D', category: 'Iron & Steel', subCategory: 'Bars & rods', brand: 'Hind TMT', hsn: '72142090', unit: 'kg', reorderLevel: 2000, rate: 62, min: 59.5 },
  { sku: 'TMT-12-HIND', name: 'TMT bar 12 mm Fe 550D', category: 'Iron & Steel', subCategory: 'Bars & rods', brand: 'Hind TMT', hsn: '72142090', unit: 'kg', reorderLevel: 3000, rate: 60.5, min: 58 },
  { sku: 'TMT-16-TATA', name: 'TMT bar 16 mm Tata Tiscon', category: 'Iron & Steel', subCategory: 'Bars & rods', brand: 'Tata Tiscon', hsn: '72142090', unit: 'kg', reorderLevel: 2000, rate: 68, min: 66 },
  { sku: 'MS-SQ-25', name: 'MS square pipe 25×25 mm 2 mm', category: 'Iron & Steel', subCategory: 'Pipes', hsn: '73066100', unit: 'kg', reorderLevel: 500, rate: 66, min: 63 },
  { sku: 'BIND-WIRE-18', name: 'Binding wire 18 gauge', category: 'Iron & Steel', subCategory: 'Wire & nails', hsn: '72172010', unit: 'kg', reorderLevel: 200, rate: 78, min: 74 },
  { sku: 'NAIL-3IN', name: 'Wire nail 3 inch', category: 'Iron & Steel', subCategory: 'Wire & nails', hsn: '73170013', unit: 'kg', reorderLevel: 100, rate: 82, min: 78 },
  { sku: 'AAC-600-150', name: 'AAC block 600×200×150 mm', category: 'Bricks & Blocks', subCategory: 'AAC / fly-ash blocks', brand: 'Magicrete', hsn: '68101190', unit: 'pcs', weightKg: 11, reorderLevel: 1000, rate: 58, min: 55 },
  { sku: 'BRICK-1ST', name: 'Red brick first class', category: 'Bricks & Blocks', subCategory: 'Red bricks', hsn: '69010010', unit: 'thousand', weightKg: 3000, reorderLevel: 10, rate: 9800, min: 9400 },
  { sku: 'PPGI-0.45-10FT', name: 'PPGI roofing sheet 0.45 mm 10 ft', category: 'Hardware & Plywood', subCategory: 'Roofing sheets', brand: 'Tata Bluescope', hsn: '72107000', unit: 'sheet', weightKg: 12.5, mrp: 1650, reorderLevel: 50, rate: 1380, min: 1320 },
  { sku: 'PLY-18-BWP', name: 'Plywood 18 mm BWP 8×4 ft', category: 'Hardware & Plywood', subCategory: 'Plywood', brand: 'Greenply', hsn: '44123100', unit: 'sheet', weightKg: 32, mrp: 4200, reorderLevel: 20, rate: 3450, min: 3300 },
];

interface PartySeed {
  displayName: string;
  isCustomer?: boolean;
  isVendor?: boolean;
  treatment: GstTreatment;
  state?: string;
  pan?: string;
  country?: string;
  foreignTaxId?: string;
  exportRoute?: 'LUT' | 'IGST';
  currency?: 'INR' | 'BTN';
  isGta?: boolean;
  city: string;
  creditDays: number;
  creditLimit?: number;
  udyamNumber?: string;
  phone?: string;
  contactPerson?: string;
}

const PARTIES: PartySeed[] = [
  // Vendors
  { displayName: 'Hind Steel Distributors', isVendor: true, treatment: 'REGISTERED', state: '19', pan: 'AAHFH4321K', city: 'Siliguri', creditDays: 30, udyamNumber: 'UDYAM-WB-15-0012345', contactPerson: 'Amit Agarwal', phone: '+919434000101' },
  { displayName: 'Bihar Steel Rolling Mills', isVendor: true, treatment: 'REGISTERED', state: '10', pan: 'AACCB7788M', city: 'Patna', creditDays: 15, contactPerson: 'R. K. Singh', phone: '+919431000202' },
  { displayName: 'Magicrete Building Solutions', isVendor: true, treatment: 'REGISTERED', state: '24', pan: 'AAJCM5566P', city: 'Surat', creditDays: 30, phone: '+919825000303' },
  { displayName: 'Dooars Brick Field', isVendor: true, treatment: 'UNREGISTERED', city: 'Hasimara', creditDays: 7, contactPerson: 'Bikash Roy', phone: '+919733000404' },
  { displayName: 'Siliguri Roadways', isVendor: true, treatment: 'REGISTERED', state: '19', pan: 'ABQPS1122R', isGta: true, city: 'Siliguri', creditDays: 15, phone: '+919800000505' },
  { displayName: 'Jaigaon Labour Contractor', isVendor: true, treatment: 'UNREGISTERED', city: 'Jaigaon', creditDays: 0, phone: '+919932000606' },
  // Customers
  { displayName: 'Alipurduar Constructions', isCustomer: true, treatment: 'REGISTERED', state: '19', pan: 'AAEFA3344B', city: 'Alipurduar', creditDays: 30, creditLimit: 1500000, contactPerson: 'S. Saha', phone: '+919434000707' },
  { displayName: 'Sharma Hardware Store', isCustomer: true, treatment: 'REGISTERED', state: '18', pan: 'ACRPS9988Q', city: 'Bongaigaon', creditDays: 15, creditLimit: 500000, phone: '+919435000808' },
  { displayName: 'Ravi Kumar (contractor)', isCustomer: true, treatment: 'UNREGISTERED', state: '19', city: 'Jaigaon', creditDays: 0, phone: '+919933000909' },
  { displayName: 'Druk Builders Pvt Ltd', isCustomer: true, treatment: 'OVERSEAS', country: 'Bhutan', foreignTaxId: 'TPN-DBL-10234', exportRoute: 'LUT', city: 'Phuentsholing', creditDays: 30, creditLimit: 3000000, contactPerson: 'Karma Wangdi', phone: '+97517100110' },
  { displayName: 'Tashi Construction', isCustomer: true, treatment: 'OVERSEAS', country: 'Bhutan', foreignTaxId: 'TPN-TC-55871', exportRoute: 'LUT', city: 'Thimphu', creditDays: 15, contactPerson: 'Tashi Dorji', phone: '+97517200220' },
];

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (!admin) throw new Error('Run npm run db:seed first: there is no administrator');

  for (const godown of GODOWNS) await prisma.godown.upsert({ where: { name: godown.name }, create: godown, update: {} });
  const categories = await prisma.itemCategory.findMany({ select: { id: true, name: true, parentId: true } });
  const categoryId = (name: string, parentId: string | null = null) => {
    const found = categories.find((category) => category.name === name && category.parentId === parentId);
    if (!found) throw new Error(`No category ${name}: run npm run db:seed first`);
    return found.id;
  };

  for (const name of BRANDS) await prisma.brand.upsert({ where: { name }, create: { name, isAuthorised: true }, update: {} });
  const brands = new Map((await prisma.brand.findMany({ select: { id: true, name: true } })).map((brand) => [brand.name, brand.id]));

  for (const code of HSN) {
    await prisma.hsnCode.upsert({
      where: { code: code.code },
      create: { code: code.code, kind: 'HSN', description: code.description, rates: { create: { ratePct: code.ratePct, effectiveFrom: day('2025-09-22') } } },
      update: {},
    });
  }

  const units = new Map((await prisma.unit.findMany({ select: { id: true, symbol: true } })).map((unit) => [unit.symbol, unit.id]));
  for (const item of ITEMS) {
    const parent = categoryId(item.category);
    const data: Prisma.ItemUncheckedCreateInput = {
      sku: item.sku,
      name: item.name,
      categoryId: parent,
      subCategoryId: categoryId(item.subCategory, parent),
      brandId: item.brand ? brands.get(item.brand) : null,
      hsn: item.hsn,
      unitId: units.get(item.unit),
      weightKg: item.weightKg ?? (item.unit === 'kg' ? 1 : null),
      mrp: item.mrp ?? null,
      reorderLevel: item.reorderLevel,
    };
    await prisma.item.upsert({ where: { sku: item.sku }, create: data, update: {} });
  }
  const items = new Map((await prisma.item.findMany({ select: { id: true, sku: true } })).map((item) => [item.sku, item.id]));

  for (const party of PARTIES) {
    const found = await prisma.party.findFirst({ where: { displayName: party.displayName }, select: { id: true } });
    if (found) continue;
    await prisma.party.create({
      data: {
        displayName: party.displayName,
        legalName: party.displayName,
        isCustomer: party.isCustomer ?? false,
        isVendor: party.isVendor ?? false,
        treatment: party.treatment,
        gstin: party.state && party.pan ? gstin(party.state, party.pan) : null,
        pan: party.pan ?? null,
        placeOfSupply: party.state ?? null,
        country: party.country ?? null,
        foreignTaxId: party.foreignTaxId ?? null,
        exportRoute: party.exportRoute ?? null,
        currency: party.currency ?? 'INR',
        isGta: party.isGta ?? false,
        city: party.city,
        creditDays: party.creditDays,
        creditLimit: party.creditLimit ?? null,
        udyamNumber: party.udyamNumber ?? null,
        contactPerson: party.contactPerson ?? null,
        phone: party.phone ?? null,
        openingBalanceSide: party.isVendor ? 'PAYABLE' : 'RECEIVABLE',
      },
    });
  }
  const parties = new Map((await prisma.party.findMany({ select: { id: true, displayName: true } })).map((party) => [party.displayName, party.id]));
  const partyId = (name: string) => parties.get(name)!;

  // The price list: this week's rates, and a one-day change today on 12 mm
  // TMT (the newer, shorter entry wins on its day; tomorrow it is the week's
  // rate again).
  const weekEnd = addDays(weekStart, 6);
  for (const item of ITEMS) {
    const itemId = items.get(item.sku)!;
    await prisma.itemPrice.upsert({
      where: { itemId_validFrom_validTill: { itemId, validFrom: day(weekStart), validTill: day(weekEnd) } },
      create: { itemId, validFrom: day(weekStart), validTill: day(weekEnd), sellingPrice: item.rate, minSellingPrice: item.min, createdById: admin.id, updatedById: admin.id, notes: 'Dev data: this week' },
      update: {},
    });
  }
  const tmt12 = items.get('TMT-12-HIND')!;
  await prisma.itemPrice.upsert({
    where: { itemId_validFrom_validTill: { itemId: tmt12, validFrom: day(today), validTill: day(today) } },
    create: { itemId: tmt12, validFrom: day(today), validTill: day(today), sellingPrice: 61.25, minSellingPrice: 58.5, createdById: admin.id, updatedById: admin.id, notes: 'Dev data: today only' },
    update: {},
  });

  // Special rates: a net rate on one item, and a % off a whole sub-category.
  const bars = categoryId('Bars & rods', categoryId('Iron & Steel'));
  const specials = [
    { partyId: partyId('Alipurduar Constructions'), itemId: tmt12, categoryId: null, kind: 'NET' as const, value: 59.75, notes: 'Dev data: contract rate' },
    { partyId: partyId('Druk Builders Pvt Ltd'), itemId: null, categoryId: bars, kind: 'DISCOUNT' as const, value: 2, notes: 'Dev data: 2% off the day rate on bars' },
  ];
  for (const special of specials) {
    const found = await prisma.specialRate.findFirst({ where: { partyId: special.partyId, itemId: special.itemId, categoryId: special.categoryId } });
    if (!found) await prisma.specialRate.create({ data: { ...special, validFrom: day(addDays(weekStart, -7)) } });
  }

  // Schemes: one of each kind, so every rule shows up on a quotation.
  const aac = categoryId('AAC / fly-ash blocks', categoryId('Bricks & Blocks'));
  const schemes: Prisma.SchemeCreateInput[] = [
    {
      name: 'Steel volume offer',
      description: '2% off bars and rods for a tonne or more, capped at ₹1,500 a line',
      level: 'LINE', benefit: 'PERCENT', value: 2, maxDiscount: 1500, minQuantity: 1000,
      rateSources: ['SHEET', 'MANUAL'], validFrom: day(addDays(weekStart, -7)),
      targets: { create: [{ categoryId: bars }] },
    },
    {
      name: 'AAC ₹1 per block',
      description: '₹1 off each AAC block from 500 blocks',
      level: 'LINE', benefit: 'AMOUNT_PER_UNIT', value: 1, minQuantity: 500,
      rateSources: ['SHEET', 'SPECIAL', 'MANUAL'], validFrom: day(addDays(weekStart, -7)),
      targets: { create: [{ categoryId: aac }] },
    },
    {
      name: 'Binding wire 50 + 1',
      description: 'One kg free for every 50 kg of binding wire; adds on to other schemes',
      level: 'LINE', benefit: 'FREE_QUANTITY', value: 1, buyQuantity: 50, stackable: true,
      rateSources: ['SHEET', 'SPECIAL', 'MANUAL'], validFrom: day(addDays(weekStart, -7)),
      targets: { create: [{ itemId: items.get('BIND-WIRE-18')! }] },
    },
    {
      name: 'Bhutan big order',
      description: '1% off orders of ₹2,00,000 or more for buyers in Bhutan, up to ₹5,000',
      level: 'ORDER', benefit: 'PERCENT', value: 1, maxDiscount: 5000, minValue: 200000, partyScope: 'OVERSEAS',
      rateSources: ['SHEET', 'SPECIAL', 'MANUAL'], validFrom: day(addDays(weekStart, -7)),
    },
    {
      name: 'Greenply festive ₹150',
      description: '₹150 off a plywood line of ₹30,000 or more; ended last week',
      level: 'LINE', benefit: 'FLAT_AMOUNT', value: 150, minValue: 30000,
      rateSources: ['SHEET', 'MANUAL'], validFrom: day(addDays(weekStart, -21)), validTill: day(addDays(weekStart, -1)),
      targets: { create: [{ brandId: brands.get('Greenply')! }] },
    },
  ];
  for (const scheme of schemes) {
    const found = await prisma.scheme.findUnique({ where: { name: scheme.name }, select: { id: true } });
    if (!found) await prisma.scheme.create({ data: scheme });
  }

  // Number formats the documents below need, from the start of this financial
  // year; a series that already has a format is left alone.
  const FORMATS: { kind: 'PURCHASE_ORDER' | 'PURCHASE' | 'QUOTATION' | 'SALES_INVOICE' | 'EXPORT_INVOICE' | 'STOCK_TRANSFER' | 'STOCK_JOURNAL' | 'RECEIPT' | 'PAYMENT'; pattern: string }[] = [
    { kind: 'PURCHASE_ORDER', pattern: 'PO/{FY}/{SEQ:4}' },
    { kind: 'PURCHASE', pattern: 'PUR/{FY}/{SEQ:4}' },
    { kind: 'QUOTATION', pattern: 'QT/{FY}/{SEQ:4}' },
    { kind: 'SALES_INVOICE', pattern: 'INV/{FY}/{SEQ:4}' },
    { kind: 'EXPORT_INVOICE', pattern: 'EXP/{FY}/{SEQ:4}' },
    { kind: 'STOCK_TRANSFER', pattern: 'ST/{FY}/{SEQ:4}' },
    { kind: 'STOCK_JOURNAL', pattern: 'SJ/{FY}/{SEQ:4}' },
    { kind: 'RECEIPT', pattern: 'RCT/{FY}/{SEQ:4}' },
    { kind: 'PAYMENT', pattern: 'PAY/{FY}/{SEQ:4}' },
  ];
  for (const format of FORMATS) {
    const series = await prisma.numberSeries.findUnique({ where: { kind: format.kind }, select: { id: true, _count: { select: { formats: true } } } });
    if (series && series._count.formats === 0) {
      await prisma.numberFormat.create({ data: { seriesId: series.id, applicableFrom: day('2026-04-01'), pattern: format.pattern, reset: 'YEARLY' } });
    }
  }

  // A bank account and a cash book for receipts and payments; made-up account
  // number. Matched by name and left alone when present.
  const MONEY_ACCOUNTS: Prisma.BankCashAccountCreateInput[] = [
    { name: 'SBI Jaigaon current account', kind: 'BANK', bankName: 'State Bank of India', branch: 'Jaigaon', accountNumber: '00000039123456789', ifsc: 'SBIN0007310', openingBalance: 250000, openingDate: day('2026-04-01'), showOnInvoice: true },
    { name: 'Cash in hand', kind: 'CASH', openingBalance: 20000, openingDate: day('2026-04-01') },
  ];
  for (const account of MONEY_ACCOUNTS) {
    if (!(await prisma.bankCashAccount.findUnique({ where: { name: account.name }, select: { id: true } }))) {
      await prisma.bankCashAccount.create({ data: account });
    }
  }

  // A made-up LUT for this financial year so export invoices under LUT can be
  // tried; not a real ARN. Left alone when the year already has one.
  if (!(await prisma.lut.findUnique({ where: { financialYear: '2026-27' }, select: { id: true } }))) {
    await prisma.lut.create({ data: { financialYear: '2026-27', arn: 'AD1904260000DEV', validFrom: day('2026-04-01'), validTo: day('2027-03-31') } });
  }

  const counts = {
    godowns: await prisma.godown.count(),
    brands: await prisma.brand.count(),
    hsnCodes: await prisma.hsnCode.count(),
    items: await prisma.item.count(),
    vendors: await prisma.party.count({ where: { isVendor: true } }),
    customers: await prisma.party.count({ where: { isCustomer: true } }),
    priceListEntries: await prisma.itemPrice.count(),
    specialRates: await prisma.specialRate.count(),
    schemes: await prisma.scheme.count(),
    bankCashAccounts: await prisma.bankCashAccount.count(),
  };
  console.log(`Dev data ready for ${today} (week from ${weekStart}):`, counts);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
