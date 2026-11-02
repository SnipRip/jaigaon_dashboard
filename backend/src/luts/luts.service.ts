import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { dateOnly } from '../common/dates.js';
import { definedFields } from '../common/dto/defined-fields.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { CreateLutDto } from './dto/create-lut.dto.js';
import type { UpdateLutDto } from './dto/update-lut.dto.js';
import { financialYearOf, lutProblem } from './lut-rules.js';
import { toLutView, type LutView } from './lut-view.js';

type LutFields = Omit<LutView, 'id' | 'financialYear'>;

// Checks the dates and turns the fields into a row. A reused ARN fails on its
// unique index (409 "already used"); so does a second LUT for one year, which
// is caught first to name the year.
async function toRow(
  tx: Prisma.TransactionClient,
  lut: LutFields,
  id?: string,
) {
  const problem = lutProblem(lut);
  if (problem) throw new BadRequestException(problem);
  const financialYear = financialYearOf(lut.validFrom);
  const sameYear = await tx.lut.findUnique({ where: { financialYear } });
  if (sameYear && sameYear.id !== id) {
    throw new ConflictException(
      `There is already an LUT for ${financialYear}. Edit that one instead.`,
    );
  }
  return {
    financialYear,
    arn: lut.arn,
    adCode: lut.adCode,
    validFrom: dateOnly(lut.validFrom),
    validTo: dateOnly(lut.validTo),
  };
}

@Injectable()
export class LutsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<LutView[]> {
    const luts = await this.prisma.lut.findMany({
      orderBy: { validFrom: 'desc' },
    });
    return luts.map(toLutView);
  }

  async create(dto: CreateLutDto): Promise<LutView> {
    return this.prisma.$transaction(async (tx) => {
      const data = await toRow(tx, {
        arn: dto.arn,
        adCode: dto.adCode ?? null,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
      });
      return toLutView(await tx.lut.create({ data }));
    });
  }

  async update(id: string, dto: UpdateLutDto): Promise<LutView> {
    return this.prisma.$transaction(async (tx) => {
      const stored = toLutView(
        await tx.lut.findUniqueOrThrow({ where: { id } }),
      );
      // Fields left out keep their stored value (definedFields).
      const data = await toRow(tx, { ...stored, ...definedFields(dto) }, id);
      return toLutView(await tx.lut.update({ where: { id }, data }));
    });
  }

  // Nothing points at an LUT yet. Export invoices will copy its ARN when they
  // are saved, so deleting a mistaken entry never rewrites an issued bill.
  async remove(id: string): Promise<void> {
    await this.prisma.lut.delete({ where: { id } });
  }
}
