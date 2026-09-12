import express, { type Request, type Response } from 'express'

import { apiHandler, DOCS_CDN as CDN, DOCS_PATH } from './api.js'
import { db } from './db.js'
import { registerGracefulShutdown } from './shutdown.js'
import { createTmdb, reportAccessToken } from './tmdb.js'

const tmdb = createTmdb({
  accessToken: process.env.TMDB_ACCESS_TOKEN,
  timeoutMs: process.env.TMDB_TIMEOUT_MS,
})

const app = express()

/**
 * The API answers JSON: it loads no subresource and belongs in no frame, so it
 * is granted nothing. `/docs` is the exception, because that page is not ours
 * — the reference plugin pulls Scalar from a CDN and configures it with an
 * inline script. Set above every route, so the 404 and any error response —
 * the ones least likely to have been thought about — carry it too.
 */
const API_CSP =
  "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
/** The bundle reaches past the CDN it is served from, to hosts of Scalar's own
 * — `fonts.` for its webfonts, `api.` for the "Ask AI" panel, `proxy.` when a
 * "Test Request" cannot go direct. Named by domain rather than one subdomain
 * at a time, so their next one does not blank the page; it buys nothing
 * anyway, on a page already running their script. */
const SCALAR = 'https://*.scalar.com'
const DOCS_CSP = `${API_CSP}; script-src 'self' 'unsafe-inline' ${CDN}; style-src 'self' 'unsafe-inline' ${CDN}; img-src 'self' data: https:; font-src 'self' data: ${CDN} ${SCALAR}; connect-src 'self' ${CDN} ${SCALAR}`

app.use((req, res, next) => {
  // The plugin serves the page with or without a trailing slash, so a policy
  // matching only one of the two would blank the other.
  const docs = req.path.replace(/\/$/, '') === DOCS_PATH
  res.setHeader('Content-Security-Policy', docs ? DOCS_CSP : API_CSP)
  // JSON read as HTML is the one way a response with no markup in it
  // becomes a page; the policy above only matters if the type is believed.
  res.setHeader('X-Content-Type-Options', 'nosniff')
  next()
})

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true })
})

app.use(apiHandler(tmdb))

// Unmatched routes fall through to here, so it must stay below every route.
app.use((req: Request, res: Response) => {
  res
    .status(404)
    .json({ error: 'Not Found', method: req.method, path: req.originalUrl })
})

const PORT = Number(process.env.PORT ?? 3000)

/** How long a client may take to deliver a request. Node's own default is five
 * minutes, and the largest body here is a 2000 character note. */
const REQUEST_TIMEOUT_MS = Number(
  process.env.SERVER_REQUEST_TIMEOUT_MS ?? 30_000,
)

const server = app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`)
  console.log(`[api] openapi reference on http://localhost:${PORT}${DOCS_PATH}`)
  void reportAccessToken(tmdb)
})

server.requestTimeout = REQUEST_TIMEOUT_MS
// The same deadline, rather than Node's separate minute for headers, which
// would otherwise outlast the request it is part of.
server.headersTimeout = REQUEST_TIMEOUT_MS

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
