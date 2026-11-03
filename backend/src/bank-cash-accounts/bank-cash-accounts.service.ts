import { BadRequestException, Injectable } from '@nestjs/common';
import { archivedFilter } from '../common/dto/archivable.js';
import { dateOnly } from '../common/dates.js';
import { definedFields } from '../common/dto/defined-fields.js';
import { assertLedgerNameFree } from '../common/tally/ledger-names.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { toBankCashAccountView, type BankCashAccountView } from './bank-cash-account-view.js';
import { accountProblem, settleAccount } from './bank-cash-rules.js';
import type { CreateBankCashAccountDto } from './dto/create-bank-cash-account.dto.js';
import type { UpdateBankCashAccountDto } from './dto/update-bank-cash-account.dto.js';

type AccountFields = Omit<BankCashAccountView, 'id' | 'tallyGroup'>;

// Checks how the fields fit together and turns them into a row. A reused
// name, Tally ledger name or IFSC + account number fails on its unique index
// (409 "already used").
function toRow(account: AccountFields) {
  const problem = accountProblem(account);
  if (problem) throw new BadRequestException(problem);
  return {
    name: account.name,
    kind: account.kind,
    bankName: account.bankName,
    branch: account.branch,
    accountNumber: account.accountNumber,
    ifsc: account.ifsc,
    upiId: account.upiId,
    openingBalance: account.openingBalance,
    openingDate: dateOnly(account.openingDate),
    showOnInvoice: account.showOnInvoice,
    tallyLedgerName: account.tallyLedgerName,
    isArchived: account.isArchived,
  };
}

// At most one account prints its bank details on invoices. Choosing one
// clears the others in the same transaction, as for the default godown.
async function clearOtherInvoiceAccount(tx: Prisma.TransactionClient, id?: string) {
  await tx.bankCashAccount.updateMany({
    where: { showOnInvoice: true, ...(id && { id: { not: id } }) },
    data: { showOnInvoice: false },
  });
}

@Injectable()
export class BankCashAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeArchived?: boolean): Promise<BankCashAccountView[]> {
    const accounts = await this.prisma.bankCashAccount.findMany({
      where: archivedFilter(includeArchived),
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
    return accounts.map(toBankCashAccountView);
  }

  create(dto: CreateBankCashAccountDto): Promise<BankCashAccountView> {
    const data = toRow({
      name: dto.name,
      kind: dto.kind,
      bankName: dto.bankName ?? null,
      branch: dto.branch ?? null,
      accountNumber: dto.accountNumber ?? null,
      ifsc: dto.ifsc ?? null,
      upiId: dto.upiId ?? null,
      openingBalance: dto.openingBalance,
      openingDate: dto.openingDate,
      showOnInvoice: dto.showOnInvoice,
      tallyLedgerName: dto.tallyLedgerName ?? null,
      isArchived: false,
    });
    return this.prisma.$transaction(async (tx) => {
      await assertLedgerNameFree(tx, data.tallyLedgerName ?? data.name);
      if (data.showOnInvoice) await clearOtherInvoiceAccount(tx);
      return toBankCashAccountView(await tx.bankCashAccount.create({ data }));
    });
  }

  update(id: string, dto: UpdateBankCashAccountDto): Promise<BankCashAccountView> {
    return this.prisma.$transaction(async (tx) => {
      const stored = toBankCashAccountView(
        await tx.bankCashAccount.findUniqueOrThrow({ where: { id } }),
      );
      // Fields left out keep their stored value (definedFields).
      const data = toRow(settleAccount<BankCashAccountView>(stored, definedFields(dto)));
      // The ledger is the Tally name when there is one, else the account name.
      const ledgerName = data.tallyLedgerName ?? data.name;
      if (ledgerName !== (stored.tallyLedgerName ?? stored.name)) {
        await assertLedgerNameFree(tx, ledgerName, { owner: 'bankCash', id });
      }
      if (data.showOnInvoice) await clearOtherInvoiceAccount(tx, id);
      return toBankCashAccountView(await tx.bankCashAccount.update({ where: { id }, data }));
    });
  }

  // Nothing points at an account yet. Once receipts and payments do, the
  // delete fails with 409 and the account is archived instead.
  async remove(id: string): Promise<void> {
    await this.prisma.bankCashAccount.delete({ where: { id } });
  }
}
