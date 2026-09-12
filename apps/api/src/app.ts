import express, { type Request, type Response } from 'express'

import { apiHandler } from './api.js'
import { db } from './db.js'
import { registerGracefulShutdown } from './shutdown.js'

const app = express()

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true })
})

app.use(apiHandler())

// Unmatched routes fall through to here, so it must stay below every route.
app.use((req: Request, res: Response) => {
  res
    .status(404)
    .json({ error: 'Not Found', method: req.method, path: req.originalUrl })
})

const PORT = Number(process.env.PORT ?? 3000)

const server = app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`)
  console.log(`[api] openapi reference on http://localhost:${PORT}/docs`)
})

// Order matters: stop taking requests, then drop the connection pool the
// in-flight ones are still using.
registerGracefulShutdown([
  {
    name: 'http server',
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  },
  { name: 'database', close: () => db.$disconnect() },
])
