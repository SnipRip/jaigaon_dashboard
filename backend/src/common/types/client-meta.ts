import type { Request } from 'express';

// Device details recorded with sessions and consent records.
export interface ClientMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export function clientMetaFrom(request: Request): ClientMeta {
  return {
    ipAddress: request.ip ?? null,
    userAgent: request.get('user-agent')?.slice(0, 255) ?? null,
  };
}
