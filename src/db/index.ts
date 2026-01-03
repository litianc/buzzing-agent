// Buzzing Clone - Database Client
// Supports both Turso (production) and local SQLite (development)

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Custom fetch with extended timeout for slow network connections (e.g., China -> Tokyo)
const fetchWithTimeout = (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const timeout = 15000; // 15 seconds timeout (default is ~10s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
  fetch: fetchWithTimeout,
});

export const db = drizzle(client, { schema });

export * from './schema';
