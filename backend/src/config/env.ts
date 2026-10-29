import { z } from 'zod';

// Every environment variable the backend reads is declared here, so a
// missing or malformed value stops the app at startup, not at first use.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.url(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  WEBSITE_API_KEY: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
