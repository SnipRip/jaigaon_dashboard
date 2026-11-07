// Lookups both purchase services make inside their transactions: our GST
// registration and the vendor, checked once in the same words everywhere.
// Sales read our registration from here too.
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { OurRegistration } from '../common/gst/our-registration.js';
import type { Prisma } from '../generated/prisma/client.js';

type Db = Prisma.TransactionClient;

export async function ourRegistration(db: Db): Promise<OurRegistration> {
  const profile = await db.companyProfile.findUnique({ where: { id: 1 }, select: { stateCode: true, registration: true } });
  if (!profile?.stateCode) throw new ConflictException('Set the company GST state on GST & export setup first');
  return profile;
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
