import { defineConfig } from 'prisma/config'

import { loadRootEnv } from '../src/env.js'

/**
 * The CLI config shared by the dev and test databases: same schema, same
 * migrations, a different URL. Prisma 7 takes the datasource URL from here and
 * loads no `.env` of its own, so this reads the repo-root file. The variable is
 * named rather than passed by value so the read happens after that load.
 */
export function defineDbConfig(urlVar: 'DATABASE_URL' | 'TEST_DATABASE_URL') {
  loadRootEnv()

  return defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: { path: 'prisma/migrations' },
    datasource: { url: process.env[urlVar] },
  })
}
