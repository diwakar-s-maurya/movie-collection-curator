import { defineConfig } from 'prisma/config'

/**
 * The CLI config shared by the dev and test databases: same schema, same
 * migrations, a different URL. Prisma 7 takes the datasource URL from here and
 * loads no `.env` of its own, so this reads the repo-root file. The variable is
 * named rather than passed by value so the read happens after that load.
 */
export function defineDbConfig(urlVar: 'DATABASE_URL' | 'TEST_DATABASE_URL') {
  try {
    process.loadEnvFile(new URL('../../../.env', import.meta.url))
  } catch {
    // No .env on disk; the environment may already carry the variables.
  }

  return defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: { path: 'prisma/migrations' },
    datasource: { url: process.env[urlVar] },
  })
}
