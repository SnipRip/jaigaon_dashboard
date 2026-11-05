// Lookups both purchase services make inside their transactions: our GST
// state and the vendor, checked once in the same words everywhere.
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

type Db = Prisma.TransactionClient;

export async function companyState(db: Db): Promise<string> {
  const profile = await db.companyProfile.findUnique({ where: { id: 1 }, select: { stateCode: true } });
  if (!profile?.stateCode) throw new ConflictException('Set the company GST state on GST & export setup first');
  return profile.stateCode;
}

export async function liveVendor(db: Db, vendorId: string) {
  const vendor = await db.party.findUnique({
    where: { id: vendorId },
    select: { id: true, isVendor: true, isArchived: true, treatment: true, placeOfSupply: true, isGta: true, creditDays: true, udyamNumber: true },
  });
  if (!vendor || !vendor.isVendor) throw new BadRequestException('That vendor does not exist');
  if (vendor.isArchived) throw new BadRequestException('This vendor is archived');
  return vendor;
}

export async function liveGodown(db: Db, godownId: string) {
  const godown = await db.godown.findUnique({ where: { id: godownId }, select: { isArchived: true } });
  if (!godown) throw new BadRequestException('That godown does not exist');
  if (godown.isArchived) throw new BadRequestException('This godown is archived');
}
