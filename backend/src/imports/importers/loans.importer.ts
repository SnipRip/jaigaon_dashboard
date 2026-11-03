// Loans taken and given, matched by ledger name. A sheet sets a loan's terms;
// entries (EMIs, interest, repayments) are recorded on the loan's page,
// where each becomes a voucher.
import { isoDate } from '../../common/dates.js';
import { toNumber } from '../../common/decimal.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { Loan } from '../../generated/prisma/client.js';
import { CreateLoanDto } from '../../loans/dto/create-loan.dto.js';
import { UpdateLoanDto } from '../../loans/dto/update-loan.dto.js';
import type { LoansService } from '../../loans/loans.service.js';
import type { CellValue, ImportColumn } from '../import-cells.js';
import { dateCell } from '../import-workbook.js';
import { pick, sameText, validDto, type MasterImporter } from '../master-importer.js';

const DIRECTIONS = { TAKEN: 'Taken (we owe)', GIVEN: 'Given (owed to us)' };
const KINDS = {
  VEHICLE: 'Vehicle',
  EQUIPMENT: 'Machinery and equipment',
  PROPERTY: 'Property',
  BUSINESS: 'Business loan',
  GOLD: 'Gold loan',
  OWNER: 'From owners or relatives',
  STAFF: 'Staff advance',
  DEPOSIT: 'Security deposit',
  OTHER: 'Other',
};
const REPAYMENTS = { EMI: 'Fixed EMI', FLEXIBLE: 'Flexible' };
const DISBURSALS = { BEFORE_BOOKS: 'Before these books', THROUGH_BANK: 'Through our bank', PAID_TO_SELLER: 'Paid to the seller' };
const FREQUENCIES = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEARLY: 'Half-yearly', YEARLY: 'Yearly', AT_MATURITY: 'At the end' };

const label = (choices: Record<string, string>, value: string | null) => (value ? (choices[value] ?? value) : null);
const day = (date: Date | null): CellValue => dateCell(date ? isoDate(date) : null);

export function loansImporter(loans: LoansService, prisma: PrismaService): MasterImporter<Loan> {
  const columns: ImportColumn<Loan>[] = [
    { header: 'Ledger name', field: 'name', kind: 'text', required: true, hint: 'The Tally ledger name; matches the row to a stored loan.', value: (loan) => loan.name },
    { header: 'Direction', field: 'direction', kind: 'choice', choices: DIRECTIONS, required: true, value: (loan) => DIRECTIONS[loan.direction] },
    { header: 'Kind', field: 'kind', kind: 'choice', choices: KINDS, required: true, value: (loan) => KINDS[loan.kind] },
    { header: 'Repayment', field: 'repayment', kind: 'choice', choices: REPAYMENTS, required: true, value: (loan) => REPAYMENTS[loan.repayment] },
    { header: 'Lender or borrower', field: 'partyName', kind: 'text', required: true, value: (loan) => loan.partyName },
    { header: 'Loan account number', field: 'loanAccountNumber', kind: 'text', value: (loan) => loan.loanAccountNumber },
    { header: 'Secured', field: 'isSecured', kind: 'yesno', value: (loan) => (loan.isSecured ? 'Yes' : 'No') },
    { header: 'Security', field: 'security', kind: 'text', value: (loan) => loan.security },
    { header: 'Principal', field: 'principal', kind: 'number', required: true, value: (loan) => toNumber(loan.principal) },
    { header: 'Interest rate %', field: 'interestRatePct', kind: 'number', required: true, value: (loan) => toNumber(loan.interestRatePct) },
    { header: 'Disbursed on', field: 'disbursedOn', kind: 'date', required: true, value: (loan) => day(loan.disbursedOn) },
    { header: 'Money came', field: 'disbursal', kind: 'choice', choices: DISBURSALS, required: true, value: (loan) => DISBURSALS[loan.disbursal] },
    { header: 'Disbursed through account', field: 'disbursalAccountId', kind: 'ref', ref: 'bankAccount', hint: 'When the money came through our bank.', value: (loan, refs) => refs.nameOf('bankAccount', loan.disbursalAccountId) },
    { header: 'Asset ledger', field: 'assetLedgerId', kind: 'ref', ref: 'ledger', hint: 'When the loan was paid to the seller: a general ledger under Fixed Assets.', value: (loan, refs) => refs.nameOf('ledger', loan.assetLedgerId) },
    { header: 'EMIs paid before these books', field: 'paidBefore', kind: 'number', keepIfBlank: true, value: (loan) => loan.paidBefore },
    { header: 'Outstanding at the start of these books', field: 'openingOutstanding', kind: 'number', value: (loan) => toNumber(loan.openingOutstanding) },
    { header: 'Tenure (months)', field: 'tenureMonths', kind: 'number', value: (loan) => loan.tenureMonths },
    { header: 'EMI', field: 'emiAmount', kind: 'number', hint: 'Blank: worked out from the terms.', value: (loan) => toNumber(loan.emiAmount) },
    { header: 'First EMI date', field: 'firstEmiDate', kind: 'date', value: (loan) => day(loan.firstEmiDate) },
    { header: 'Interest due', field: 'interestFrequency', kind: 'choice', choices: FREQUENCIES, hint: 'Flexible loans only.', value: (loan) => label(FREQUENCIES, loan.interestFrequency) },
    { header: 'First interest date', field: 'firstInterestDate', kind: 'date', value: (loan) => day(loan.firstInterestDate) },
    { header: 'Repay by', field: 'maturityDate', kind: 'date', value: (loan) => day(loan.maturityDate) },
    { header: 'Repaid from account', field: 'repaymentAccountId', kind: 'ref', ref: 'bankAccount', required: true, value: (loan, refs) => refs.nameOf('bankAccount', loan.repaymentAccountId) },
    { header: 'Interest ledger', field: 'interestHeadId', kind: 'ref', ref: 'accountHead', hint: 'A head from Expense & income heads: an expense head for a loan taken, an income head for a loan given. Blank: Interest on Loan, or Interest Received.', value: (loan, refs) => refs.nameOf('accountHead', loan.interestHeadId) },
    { header: 'TDS rate %', field: 'tdsRatePct', kind: 'number', value: (loan) => toNumber(loan.tdsRatePct) },
    { header: 'TDS ledger', field: 'tdsLedgerId', kind: 'ref', ref: 'ledger', hint: 'A general ledger. Blank: TDS Payable on Interest, or TDS Receivable for a loan given.', value: (loan, refs) => refs.nameOf('ledger', loan.tdsLedgerId) },
    { header: 'Remind days before', field: 'reminderDays', kind: 'number', keepIfBlank: true, value: (loan) => loan.reminderDays },
    { header: 'Notes', field: 'notes', kind: 'text', value: (loan) => loan.notes },
  ];
  return {
    key: 'loans',
    title: 'loans',
    module: '/loans',
    columns,
    refs: ['bankAccount', 'accountHead', 'ledger'],
    archivable: true,
    list: () => prisma.loan.findMany({ orderBy: [{ direction: 'asc' }, { name: 'asc' }] }),
    findExisting: async (values) =>
      values.name ? ((await prisma.loan.findFirst({ where: { name: sameText(values.name) } }))?.id ?? null) : null,
    create: async (values) => (await loans.create(await validDto(CreateLoanDto, pick(values, columns.map((column) => column.field))))).id,
    update: async (id, values) => void (await loans.update(id, await validDto(UpdateLoanDto, values))),
  };
}
