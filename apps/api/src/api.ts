import type { TmdbClient } from '@curator/tmdb'
import { OpenAPIHandler } from '@orpc/openapi/node'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { RPCHandler } from '@orpc/server/node'
import {
  RequestHeadersPlugin,
  ResponseHeadersPlugin,
} from '@orpc/server/plugins'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import type { RequestHandler } from 'express'

import { router } from './routers/index.js'

/** The one HTML route the API has, and so the one its CSP has to allow. */
export const DOCS_PATH = '/docs'

/** Pinned rather than left to the plugin's default, so the origin the CSP
 * allows cannot drift from the one `/docs` actually loads. */
const DOCS_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference'
export const DOCS_CDN = new URL(DOCS_SCRIPT_URL).origin

/**
 * The session is a cookie, so procedures get the request's headers to read one
 * and a response `Headers` to set one, neither carrying Express's types. A
 * fresh pair per handler: a plugin instance registers itself on the handler it
 * is given.
 */
const headerPlugins = () => [
  new RequestHeadersPlugin(),
  new ResponseHeadersPlugin(),
]

/**
 * What the SPA talks to. The RPC protocol carries oRPC's own serialisation, so
 * the client is inferred straight from `ApiRouter` with no codegen step.
 */
const rpcHandler = new RPCHandler(router, { plugins: headerPlugins() })

/**
 * The same procedures as plain HTTP routes, taking their method and path from
 * the `route` on the procedure and their schemas from the Zod schemas that
 * validate the call. The API is curl-able and documented at `/docs` with no
 * second source of truth.
 */
const openapiHandler = new OpenAPIHandler(router, {
  plugins: [
    ...headerPlugins(),
    new OpenAPIReferencePlugin({
      docsPath: DOCS_PATH,
      docsScriptUrl: DOCS_SCRIPT_URL,
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: { title: 'Movie Collection Curator', version: '0.0.0' },
      },
    }),
  ],
})

/**
 * Mounts both handlers at the root: RPC under `/rpc`, the REST routes over
 * everything else. Requests neither recognises fall through to Express below.
 * Nothing may parse the body above this: the handlers read the stream
 * themselves.
 */
export function apiHandler(tmdb: TmdbClient): RequestHandler {
  return async (req, res, next) => {
    const context = { tmdb }

    const rpc = await rpcHandler.handle(req, res, { context, prefix: '/rpc' })
    if (rpc.matched) return

    const openapi = await openapiHandler.handle(req, res, { context })
    if (!openapi.matched) next()
  }
}
