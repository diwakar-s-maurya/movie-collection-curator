import { authed } from '../orpc.js'
import { movieSearchInput, movieSearchPage } from '../schemas/movies.js'
import * as service from '../services/movies.js'

export const moviesRouter = {
  search: authed
    .route({
      method: 'GET',
      path: '/movies/search',
      summary:
        'Search TMDB, flagging hits a collection already holds when one is named',
    })
    .input(movieSearchInput)
    .output(movieSearchPage)
    .handler(({ input, context }) =>
      service.searchMovies(context.tmdb, context.user.id, input),
    ),
}
