import type { TmdbClient } from '@curator/tmdb'
import { OpenAPIHandler } from '@orpc/openapi/node'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import {
  RequestHeadersPlugin,
  ResponseHeadersPlugin,
} from '@orpc/server/plugins'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import type { RequestHandler } from 'express'

import { router } from './routers/index.js'

/**
 * Every procedure is also a plain HTTP route, taking its method and path from
 * the `route` on the procedure and its request and response schemas from the
 * same Zod schemas that validate the call. So the API is curl-able, readable
 * in the network tab, and documented at `/docs` without a second source of
 * truth to keep in step.
 */
const handler = new OpenAPIHandler(router, {
  plugins: [
    // The session is a cookie, so procedures get the request's headers to read
    // one and a response Headers to set one. Neither carries Express's types,
    // so the router stays independent of what serves it.
    new RequestHeadersPlugin(),
    new ResponseHeadersPlugin(),
    new OpenAPIReferencePlugin({
      docsPath: '/docs',
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: { title: 'Movie Collection Curator', version: '0.0.0' },
      },
    }),
  ],
})

/**
 * Mounts the API at the root. Requests it does not recognise fall through to
 * whatever Express has below, so `/health` and the 404 still belong to
 * Express. Nothing may parse the body above this: the handler reads the
 * request stream itself.
 */
export function apiHandler(tmdb: TmdbClient): RequestHandler {
  return async (req, res, next) => {
    const { matched } = await handler.handle(req, res, {
      context: { tmdb },
    })

    if (!matched) next()
  }
}
