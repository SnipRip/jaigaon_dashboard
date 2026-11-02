import { BadRequestException, Injectable } from '@nestjs/common';
import { definedFields } from '../common/dto/defined-fields.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CompanyProfile } from '../generated/prisma/client.js';
import { companyProblem, settleCompany } from './company-profile-rules.js';
import type { UpdateCompanyProfileDto } from './dto/update-company-profile.dto.js';

/** The profile as the API returns it; the row id is always 1. */
export type CompanyProfileView = Omit<CompanyProfile, 'id'>;

const toView = ({ id: _id, ...profile }: CompanyProfile): CompanyProfileView =>
  profile;

// The single company profile row, created by its migration.
@Injectable()
export class CompanyProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<CompanyProfileView> {
    return toView(
      await this.prisma.companyProfile.findUniqueOrThrow({ where: { id: 1 } }),
    );
  }

  async update(dto: UpdateCompanyProfileDto): Promise<CompanyProfileView> {
    return this.prisma.$transaction(async (tx) => {
      const stored = await tx.companyProfile.findUniqueOrThrow({
        where: { id: 1 },
      });
      // Fields left out keep their stored value; null clears an optional one.
      const merged = { ...stored, ...definedFields(dto) };
      // A new GSTIN brings its own PAN unless one was sent too.
      if (dto.gstin !== undefined && dto.gstin !== stored.gstin) {
        merged.pan = dto.pan ?? null;
      }
      const settled = settleCompany(merged);
      const problem = companyProblem(settled);
      if (problem) throw new BadRequestException(problem);
      const { id: _id, updatedAt: _updated, ...data } = settled;
      return toView(await tx.companyProfile.update({ where: { id: 1 }, data }));
    });
  }
}
