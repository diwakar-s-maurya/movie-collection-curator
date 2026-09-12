import { defineDbConfig } from './prisma/config.js'

// A second config rather than a flag on the first: there is then no way for a
// migrate command to reach the dev database by forgetting to set something.
export default defineDbConfig('TEST_DATABASE_URL')
