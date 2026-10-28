// Creates the first administrator from SEED_ADMIN_* in .env.
// Run with `npm run db:seed`. Safe to re-run: an existing user is left alone.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
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
} finally {
  await prisma.$disconnect();
}
