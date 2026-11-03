// General ledgers (capital, sales, purchase, GST, TDS, fixed assets…),
// matched by ledger name. The group is written by its name, as in Tally.
import { toNumber } from '../../common/decimal.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { Ledger } from '../../generated/prisma/client.js';
import { CreateLedgerDto } from '../../ledgers/dto/create-ledger.dto.js';
import { UpdateLedgerDto } from '../../ledgers/dto/update-ledger.dto.js';
import type { LedgersService } from '../../ledgers/ledgers.service.js';
import type { ImportColumn } from '../import-cells.js';
import { pick, sameText, validDto, type MasterImporter } from '../master-importer.js';

const SIDES = { DR: 'Dr', CR: 'Cr' };
const TAX_KINDS = { CGST: 'CGST', SGST: 'SGST', IGST: 'IGST', CESS: 'Cess', TDS: 'TDS', TCS: 'TCS', OTHER: 'Other' };

export function ledgersImporter(ledgers: LedgersService, prisma: PrismaService): MasterImporter<Ledger> {
  const columns: ImportColumn<Ledger>[] = [
    { header: 'Ledger name', field: 'name', kind: 'text', required: true, hint: 'The Tally ledger name; matches the row to a stored ledger.', value: (ledger) => ledger.name },
    { header: 'Under group', field: 'groupId', kind: 'ref', ref: 'ledgerGroup', required: true, hint: "A Tally group (Fixed Assets, Duties & Taxes…) or one of yours.", value: (ledger, refs) => refs.nameOf('ledgerGroup', ledger.groupId) },
    { header: 'Opening balance', field: 'openingBalance', kind: 'number', keepIfBlank: true, value: (ledger) => toNumber(ledger.openingBalance) },
    { header: 'Dr / Cr', field: 'openingSide', kind: 'choice', choices: SIDES, keepIfBlank: true, value: (ledger) => SIDES[ledger.openingSide] },
    { header: 'Tax', field: 'taxKind', kind: 'choice', choices: TAX_KINDS, hint: 'Ledgers under Duties & Taxes only.', value: (ledger) => (ledger.taxKind ? TAX_KINDS[ledger.taxKind] : null) },
    { header: 'Notes', field: 'notes', kind: 'text', value: (ledger) => ledger.notes },
  ];
  return {
    key: 'ledgers',
    title: 'general ledgers',
    module: '/masters/ledgers',
    columns,
    refs: ['ledgerGroup'],
    archivable: true,
    // Profit & Loss A/c sits under Primary and is not edited from a sheet.
    list: () => prisma.ledger.findMany({ where: { groupId: { not: null } }, orderBy: { name: 'asc' } }),
    findExisting: async (values) =>
      values.name ? ((await prisma.ledger.findFirst({ where: { name: sameText(values.name) } }))?.id ?? null) : null,
    create: async (values) => (await ledgers.create(await validDto(CreateLedgerDto, pick(values, columns.map((column) => column.field))))).id,
    update: async (id, values) => void (await ledgers.update(id, await validDto(UpdateLedgerDto, values))),
  };
}
