// Creates the first administrator from SEED_ADMIN_* in .env, plus the starting
// reference data: units, access roles and the category tree from the
// brochure (agent/masters-plan.md). Run with `npm run db:seed`. Safe to
// re-run: existing rows are left as they are, so edits made in the app stay.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type UnitKind } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/auth/password-hashing.js';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_RULE_MESSAGE,
} from '../src/auth/password-policy.js';

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
const fullName = process.env.SEED_ADMIN_NAME?.trim() || 'Admin User';

if (!email || !password) {
  throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env');
}
if (password.length < PASSWORD_MIN_LENGTH || !PASSWORD_PATTERN.test(password)) {
  throw new Error(PASSWORD_RULE_MESSAGE);
}

// Units the brochure's products are sold in, with their GST unit codes (UQC).
const UNITS: { symbol: string; name: string; kind: UnitKind; decimals: number; uqc: string }[] = [
  { symbol: 'kg', name: 'Kilogram', kind: 'WEIGHT', decimals: 3, uqc: 'KGS' },
  { symbol: 'ton', name: 'Metric ton', kind: 'WEIGHT', decimals: 3, uqc: 'MTS' },
  { symbol: 'pcs', name: 'Pieces', kind: 'COUNT', decimals: 0, uqc: 'PCS' },
  { symbol: 'bag', name: 'Bag', kind: 'COUNT', decimals: 0, uqc: 'BAG' },
  { symbol: 'bundle', name: 'Bundle', kind: 'COUNT', decimals: 0, uqc: 'BDL' },
  { symbol: 'sheet', name: 'Sheet', kind: 'COUNT', decimals: 0, uqc: 'PCS' },
  { symbol: 'box', name: 'Box', kind: 'COUNT', decimals: 0, uqc: 'BOX' },
  { symbol: 'thousand', name: 'Thousand (bricks)', kind: 'COUNT', decimals: 2, uqc: 'THD' },
  { symbol: 'CBM', name: 'Cubic metre', kind: 'VOLUME', decimals: 3, uqc: 'CBM' },
  { symbol: 'cft', name: 'Cubic foot', kind: 'VOLUME', decimals: 2, uqc: 'CFT' },
  { symbol: 'sq ft', name: 'Square foot', kind: 'AREA', decimals: 2, uqc: 'SQF' },
  { symbol: 'm', name: 'Metre', kind: 'LENGTH', decimals: 2, uqc: 'MTR' },
  { symbol: 'L', name: 'Litre', kind: 'VOLUME', decimals: 2, uqc: 'LTR' },
];

// A first proposal of roles for the client to confirm. Keys are the
// dashboard's sidebar hrefs.
const VIEW = ['view'];
const WORK = ['view', 'create', 'edit'];
const grant = (actions: string[], modules: string[]) =>
  Object.fromEntries(modules.map((module) => [module, actions]));

const ROLES = [
  {
    name: 'Accountant',
    description: 'Bills, expenses, payments, GST and reports; reads sales',
    permissions: {
      ...grant(VIEW, ['/dashboard', '/rate-enquiry', '/quotations', '/invoices', '/shipments', '/documents', '/profit', '/reports', '/customers', '/items', '/rates']),
      ...grant(WORK, ['/purchases', '/expenses', '/payments', '/vendors', '/masters', '/masters/hsn', '/masters/tax-export', '/masters/bank-cash', '/masters/expense-heads', '/masters/number-series']),
    },
  },
  {
    name: 'Sales',
    description: 'Rate enquiry, quotations, invoices and customers; no costs or profit',
    permissions: {
      ...grant(WORK, ['/rate-enquiry', '/quotations', '/invoices', '/customers', '/whatsapp']),
      ...grant(VIEW, ['/dashboard', '/items', '/shipments']),
    },
  },
  {
    name: 'Store',
    description: 'Stock, shipments and documents at the yard',
    permissions: {
      ...grant(WORK, ['/items', '/shipments', '/documents', '/masters/godowns', '/masters/units', '/masters/brands']),
      ...grant(VIEW, ['/dashboard', '/purchases']),
    },
  },
];

// Category → sub-categories, from the brochure. Defaults (HSN, GST, unit)
// are left for the client's accountant to set.
const CATEGORIES: [string, string[]][] = [
  ['Bricks & Blocks', ['AAC / fly-ash blocks', 'Red bricks']],
  ['Iron & Steel', ['Bars & rods', 'Pipes', 'Structural sections', 'Plates & sheets', 'Wire & nails', 'Fasteners', 'Castings']],
  ['Flooring & Stone', ['Stone chips', 'Powders', 'Granite & marble', 'Tiles']],
  ['Hardware & Plywood', ['Roofing sheets', 'HDPE pipes', 'Plywood', 'Screws & door fittings', 'Ropes & covers', 'Tools & equipment']],
  ['Crusher Parts', ['Screens', 'Jaw plates', 'Bearings', 'Belts', 'Springs']],
  ['Electricals', []],
  ['Sanitary', []],
  ['Paints', []],
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists, nothing to do.`);
  } else {
    await prisma.user.create({
      data: {
        email,
        fullName,
        displayName: fullName,
        role: 'ADMIN',
        passwordHash: await hashPassword(password),
      },
    });
    console.log(`Created administrator ${email}.`);
  }

  for (const unit of UNITS) {
    await prisma.unit.upsert({ where: { symbol: unit.symbol }, create: unit, update: {} });
  }
  for (const role of ROLES) {
    await prisma.accessRole.upsert({ where: { name: role.name }, create: role, update: {} });
  }
  for (const [order, [name, subCategories]] of CATEGORIES.entries()) {
    const category =
      (await prisma.itemCategory.findFirst({ where: { parentId: null, name } })) ??
      (await prisma.itemCategory.create({ data: { name, sortOrder: order } }));
    for (const [subOrder, subName] of subCategories.entries()) {
      await prisma.itemCategory.upsert({
        where: { parentId_name: { parentId: category.id, name: subName } },
        create: { name: subName, parentId: category.id, sortOrder: subOrder },
        update: {},
      });
    }
  }
  console.log(`Reference data: ${UNITS.length} units, ${ROLES.length} roles, ${CATEGORIES.length} categories.`);
} finally {
  await prisma.$disconnect();
}
