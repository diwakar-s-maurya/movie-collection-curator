# Plan: Movie Collection Curator

Working plan for the requirement in REQUIREMENT.md. Budget: ~4 hours of build time, committed as I go.

This file is the build plan: what to make, and in what order. The three things it does not carry: Read them when necessary.

- **Why** — the decision log, the stats rationale, the ambiguity readings and the run instructions live in [README.md](README.md), which is the submission.
- **How** — the router, schemas, validation limits, TMDB endpoints, cache policy and component inventory live in [IMPLEMENTATION.md](IMPLEMENTATION.md).
- **What it feels like** — the screens, their states and the interactions live in [UI_design.md](UI_design.md).

## 1. Stack

| Layer | Choice |
|---|---|
| Language | TypeScript everywhere, pnpm workspaces monorepo |
| TMDB library | `packages/tmdb`, hand-written client over native `fetch` |
| API | Node + oRPC — typed procedures, Zod input/output schemas, OpenAPI handler |
| Data store | PostgreSQL + Prisma ORM + Prisma Migrate |
| Web | Vite + React + TS, oRPC client + TanStack Query, TanStack Router on browser history, Tailwind + shadcn/ui |
| Tests | Vitest — three suites: TMDB client (fake fetch: error mapping, response validation, request shape), schema normalisation (the two inputs with rules worth getting wrong), services against a separate test database (per-user scoping, stats SQL against fixtures) |

Repo layout:

```
packages/tmdb/        # TMDB wrapper library
apps/api/             # oRPC server, Prisma schema, migrations, services
apps/web/             # SPA
docker-compose.yml    # postgres only, with a dev and a test database
README.md
```

Run: `docker compose up -d` (Postgres only) then `pnpm install && pnpm dev`. The requirement brief says no Docker, and compose is only there so a local Postgres is one command. The test suite points at its own database so `pnpm test` never wipes demo data.

Four tables: `users`, `collections`, `movies` (the TMDB snapshot cache) and `collection_movies` (membership plus annotation). Columns, indexes and migration notes are in [IMPLEMENTATION.md](IMPLEMENTATION.md).

## 2. Build order

1. `chore: scaffold pnpm monorepo, tsconfig, biome`
2. `feat(tmdb): client with searchMovies, getMovie and verifyAccessToken, zod response validation, error mapping, tests`
3. `feat(api): prisma schema, migrations, docker-compose postgres with dev and test databases`
4. `feat(api): tmdb client from env, access token verified at boot`
5. `feat(api): orpc server with OpenAPI handler, name-only sign-in with normalised name and user id cookie, auth middleware`
6. `feat(api): paginated collections list, get/create/delete, scoping test`
7. `feat(api): add/remove movie with TMDB snapshot on add, movie search with inCollection flag`
8. `feat(api): paginated collection movies, updateAnnotation with partial note/tags/rating input, annotation schema test`
9. `feat(api): stats module with summary, genre and tag SQL, wired into list and get, stats test`
10. `feat(web): vite/react scaffold with /api proxy, orpc client + tanstack query, tanstack router on browser history, sign-in route and auth guard`
11. `feat(web): collections list view`
12. `feat(web): collection detail with paginated grid, debounced search, add`
13. `feat(web): annotation mutation with optimistic cache patch, star rating, annotation dialog, stats strip`
14. `docs: readme with run instructions, decision log, more-time, 100x, notes`
15. Polish pass: error/empty/loading states, small cleanups.

## 3. Scope reference

What the app does, kept here as a checklist against the requirement. Detail lives in the two other files.

- **TMDB library** — `searchMovies` and `getMovie` over native `fetch`. Response bodies are validated with Zod against TMDB's raw shape, then mapped to the library's own types, so callers never see TMDB field names.
- **API** — procedures for auth, collections, collection movies and movie search, each with Zod schemas; the OpenAPI handler also exposes every procedure as a plain HTTP route. `collections.get` returns the collection plus stats; `collections.list` and `collectionMovies.list` are both paginated — offset (`page`/`pageSize`), which is the simple thing that works at this size. Cursor pagination keyed on the sort column is future work: it is what stops a page boundary wobbling when rows are added mid-browse, and what keeps deep pages cheap.
- **Web** — three views: sign-in, collections list, and collection detail with the stats strip, paginated movie grid, search dialog and annotation dialog. TanStack Router with code-based routes on browser history, so a refresh keeps the view and a collection can be linked to; if the URL must stay fixed after all, memory history is a one-line swap in the router setup. Dev server proxies `/api` to the API so cookies are same-origin and there is no CORS setup.
- **Tests** — three suites, each where a bug would be silent: TMDB client error mapping, response validation and request shape (fake `fetch`); schema normalisation (pure): the collection input and the annotation patch; services against a separate test database for per-user scoping and the stats SQL against known fixtures. Rationale in the README tests section.
- **Stats shown** — movie count, total runtime, average rating with rated count (summary query, on list cards and detail); release-year span, top-5 genre breakdown and top tags (detail only). All computed on read in SQL, nothing stored. Skipped: TMDB vote average comparison, popularity, language mix. Why these: README decision log.
