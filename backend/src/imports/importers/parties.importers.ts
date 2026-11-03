// Customers and vendors: one party model, two sheets. A row matches a stored
// party of that role by GSTIN, else by display name. Importing customers
// never changes whether a party is also a vendor, and the other way round.
import type { PrismaService } from '../../database/prisma.service.js';
import type { Party } from '../../generated/prisma/client.js';
import { CreatePartyDto } from '../../parties/dto/create-party.dto.js';
import { UpdatePartyDto } from '../../parties/dto/update-party.dto.js';
import type { PartiesService } from '../../parties/parties.service.js';
import { toNumber } from '../../common/decimal.js';
import { RowProblem, type ImportColumn } from '../import-cells.js';
import { pick, sameText, textOf, validDto, type MasterImporter } from '../master-importer.js';

const KINDS = { BUSINESS: 'Business', INDIVIDUAL: 'Individual' };
const TREATMENTS = {
  REGISTERED: 'Registered',
  COMPOSITION: 'Composition',
  UNREGISTERED: 'Unregistered business',
  CONSUMER: 'Consumer',
  OVERSEAS: 'Overseas',
  SEZ: 'SEZ',
};
const CURRENCIES = { INR: 'INR', BTN: 'BTN' };
const ROUTES = { LUT: 'Under LUT (no IGST)', IGST: 'IGST paid' };
const SIDES = { RECEIVABLE: 'They owe us', PAYABLE: 'We owe them' };

const label = (choices: Record<string, string>, value: string | null) => (value ? (choices[value] ?? value) : null);

function partyColumns(role: 'customer' | 'vendor'): ImportColumn<Party>[] {
  return [
    { header: 'Display name', field: 'displayName', kind: 'text', required: true, value: (party) => party.displayName },
    { header: 'Legal name', field: 'legalName', kind: 'text', value: (party) => party.legalName },
    { header: 'Business or individual', field: 'kind', kind: 'choice', choices: KINDS, keepIfBlank: true, value: (party) => label(KINDS, party.kind) },
    { header: 'GST treatment', field: 'treatment', kind: 'choice', choices: TREATMENTS, required: true, value: (party) => label(TREATMENTS, party.treatment) },
    { header: 'GSTIN', field: 'gstin', kind: 'text', hint: 'Registered, composition and SEZ parties.', value: (party) => party.gstin },
    { header: 'PAN', field: 'pan', kind: 'text', hint: 'Blank: taken from the GSTIN.', value: (party) => party.pan },
    { header: 'Place of supply', field: 'placeOfSupply', kind: 'text', hint: 'Two-digit GST state code, 19 for West Bengal. Blank: from the GSTIN.', value: (party) => party.placeOfSupply },
    { header: 'Country', field: 'country', kind: 'text', hint: 'Overseas parties only: Bhutan…', value: (party) => party.country },
    { header: 'Foreign tax ID', field: 'foreignTaxId', kind: 'text', value: (party) => party.foreignTaxId },
    { header: 'Currency', field: 'currency', kind: 'choice', choices: CURRENCIES, keepIfBlank: true, value: (party) => party.currency },
    ...(role === 'customer'
      ? [{ header: 'Export route', field: 'exportRoute', kind: 'choice', choices: ROUTES, value: (party) => label(ROUTES, party.exportRoute) } satisfies ImportColumn<Party>]
      : [{ header: 'Bills as a GTA', field: 'isGta', kind: 'yesno', hint: 'A goods transport agency: freight under reverse charge.', value: (party) => (party.isGta ? 'Yes' : 'No') } satisfies ImportColumn<Party>]),
    { header: 'Contact person', field: 'contactPerson', kind: 'text', value: (party) => party.contactPerson },
    { header: 'Phone', field: 'phone', kind: 'text', value: (party) => party.phone },
    { header: 'Email', field: 'email', kind: 'text', value: (party) => party.email },
    { header: 'Address', field: 'addressLine', kind: 'text', value: (party) => party.addressLine },
    { header: 'City', field: 'city', kind: 'text', value: (party) => party.city },
    { header: 'PIN', field: 'pin', kind: 'text', value: (party) => party.pin },
    { header: 'Credit days', field: 'creditDays', kind: 'number', keepIfBlank: true, value: (party) => party.creditDays },
    { header: 'Credit limit', field: 'creditLimit', kind: 'number', value: (party) => toNumber(party.creditLimit) },
    ...(role === 'customer'
      ? [{ header: 'Price level', field: 'priceLevelId', kind: 'ref', ref: 'priceLevel', value: (party, refs) => refs.nameOf('priceLevel', party.priceLevelId) } satisfies ImportColumn<Party>]
      : []),
    { header: 'Opening balance', field: 'openingBalance', kind: 'number', keepIfBlank: true, value: (party) => toNumber(party.openingBalance) },
    { header: 'Opening balance is', field: 'openingBalanceSide', kind: 'choice', choices: SIDES, keepIfBlank: true, value: (party) => label(SIDES, party.openingBalanceSide) },
    { header: 'Udyam number', field: 'udyamNumber', kind: 'text', hint: 'MSME registration: UDYAM-WB-00-0000000.', value: (party) => party.udyamNumber },
    { header: 'Bank', field: 'bankName', kind: 'text', value: (party) => party.bankName },
    { header: 'Bank account number', field: 'bankAccountNumber', kind: 'text', value: (party) => party.bankAccountNumber },
    { header: 'IFSC', field: 'ifsc', kind: 'text', value: (party) => party.ifsc },
    { header: 'Notes', field: 'notes', kind: 'text', value: (party) => party.notes },
  ];
}

function partiesImporter(role: 'customer' | 'vendor', parties: PartiesService, prisma: PrismaService): MasterImporter<Party> {
  const columns = partyColumns(role);
  const roleWhere = role === 'customer' ? { isCustomer: true } : { isVendor: true };
  return {
    key: `${role}s`,
    title: `${role}s`,
    module: `/${role}s`,
    columns,
    refs: role === 'customer' ? ['priceLevel'] : [],
    archivable: true,
    list: () => prisma.party.findMany({ where: roleWhere, orderBy: { displayName: 'asc' } }),
    // A GSTIN is unique across all parties: a vendor already on file who
    // appears in the customer sheet becomes both.
    findExisting: async (values) => {
      if (typeof values.gstin === 'string') {
        const byGstin = await prisma.party.findFirst({ where: { gstin: values.gstin.toUpperCase() } });
        if (byGstin) return byGstin.id;
      }
      if (!values.displayName) return null;
      const named = await prisma.party.findMany({ where: { ...roleWhere, displayName: sameText(values.displayName) }, take: 2 });
      if (named.length > 1) throw new RowProblem(`More than one ${role} is called "${textOf(values.displayName)}"; add their GSTIN or record ID`);
      return named[0]?.id ?? null;
    },
    create: async (values, { auth }) => {
      const flags = role === 'customer' ? { isCustomer: true, isVendor: false } : { isCustomer: false, isVendor: true };
      const dto = await validDto(CreatePartyDto, { ...pick(values, columns.map((column) => column.field)), ...flags });
      return (await parties.create(auth, dto)).id;
    },
    update: async (id, values, { auth }) => {
      const flags = role === 'customer' ? { isCustomer: true } : { isVendor: true };
      await parties.update(auth, id, await validDto(UpdatePartyDto, { ...values, ...flags }));
    },
  };
}

export const customersImporter = (parties: PartiesService, prisma: PrismaService) => partiesImporter('customer', parties, prisma);
export const vendorsImporter = (parties: PartiesService, prisma: PrismaService) => partiesImporter('vendor', parties, prisma);
