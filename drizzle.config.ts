import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host:     'localhost',
    user:     'root',
    password: 'HamzaMizou42',
    database: 'jotun_tamboola',
  },
} satisfies Config;