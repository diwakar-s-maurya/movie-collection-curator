# Movie Collection Curator

Create named movie collections, search TMDB to fill them, and annotate each film *within* a collection with your own note, tags and 1–5 rating. Each collection surfaces derived stats: how many films, how long they would take to watch, your average rating, the release-year span, and what the collection is about by genre and by your own tags.

TypeScript end to end: a TMDB wrapper library, an oRPC API over Postgres 18, and a React SPA that infers its types from the API's router.

```
packages/tmdb/        # TMDB wrapper library (deliverable 1)
apps/api/             # oRPC server, Prisma schema + migrations, services (deliverable 2)
apps/web/             # Vite + React SPA (deliverable 3)
docker-compose.yml    # postgres only, with a dev and a test database
```

## Running it

Prerequisites: Node 22+, pnpm, and Postgres 18 or newer (the schema uses its native `uuidv7()` for primary keys). The compose file gives you the Postgres in one command if you have Docker; if you already run Postgres, skip it and point `DATABASE_URL` (and `TEST_DATABASE_URL`, if you want the tests) at yours.

```bash
cp .env.example .env        # then put your TMDB token in it
docker compose up -d        # postgres only
pnpm install && pnpm dev    # generates the Prisma client, migrates, starts API + web
```

- Web: http://localhost:5173 — the SPA. It talks to the API through Vite's dev proxy at `/api`, so the browser only ever sees one origin.
- API: http://localhost:3000
- OpenAPI docs: http://localhost:3000/docs — every procedure is also a plain HTTP route, so the API is curl-able and readable in the network tab.

`docker compose down -v` throws the database away to start clean.

Sign-in is name-only: type any name, an existing name signs you in, a new name creates the user. Names are trimmed and lowercased, so `Alice` and `alice` are the same person. To see multi-user scoping, open a second browser (or a private window) and sign in as someone else.

The brief says no Docker, and I read that as no deployment work: no images for the app, no CI, no cloud. The compose file exists only because a local Postgres is the one prerequisite that is annoying to install by hand.

### Environment

| Var | What it is |
|---|---|
| `TMDB_ACCESS_TOKEN` | TMDB v4 read access token, sent as `Authorization: Bearer`. The v3 API key is not supported: one auth path. |
| `DATABASE_URL` | Postgres connection string. `.env.example` carries the one that matches the compose file. |
| `TEST_DATABASE_URL` | Second database, used only by the service tests, which truncate it. Also in `.env.example`, pointing at the compose file's test database. |

### Tests

```bash
pnpm test                   # unit suites; the service suite truncates TEST_DATABASE_URL, never DATABASE_URL
```

Tests are not required by the brief, so I wrote them only where a bug would be silent — where the app keeps working and shows you something wrong. Three suites:

- **TMDB client** (`packages/tmdb`), against an injected fake `fetch`. Error mapping: 404 → `NOT_FOUND`, 429 → `RATE_LIMITED`, malformed JSON → `UPSTREAM`, a 200 whose body fails the Zod response schema → `INVALID_RESPONSE`, plus the happy path. Request shape: the auth header is set and `query` is URL-encoded. I cannot make TMDB return a 429 or change its shape on demand, so this is the only way to exercise those branches at all.
- **Annotation input normalisation** (`apps/api`, pure Zod schema): tags are trimmed, de-duplicated, empties dropped and capped; rating rejects 0, 6 and 3.5. A bug here is invisible — `"sci-fi "` and `"sci-fi"` silently become two tags and the tag breakdown lies.
- **Services against the database** (`apps/api`, against `TEST_DATABASE_URL`, truncates between tests). Two things: per-user scoping — user A reading, mutating or deleting user B's collection gets `NOT_FOUND`, never data; and the stats SQL — a collection built from known fixtures returns the expected count, runtime, average, rated count, year span and top genres and tags; average is null when nothing is rated; a movie with no runtime or no release date does not break the sums or the span. Scoping is the "assume multiple users" requirement, and a failure there is a data leak with no error. The stats are three hand-written queries (decision 5) that Prisma cannot type-check, so a wrong join or a null handled badly renders a confidently wrong number.

No component tests, no end-to-end, nothing that exercises the oRPC layer or the cookie. Left as future work.

## Stack, and why

| Layer | Choice |
|---|---|
| Language | TypeScript, pnpm workspaces monorepo — one toolchain, shared types across all three deliverables. |
| TMDB library | Hand-written client over native `fetch`. No client library, per the brief. Responses are validated with Zod against TMDB's raw shape and mapped to the library's own types, so a shape change upstream is a loud `INVALID_RESPONSE` rather than an `undefined` three layers later. |
| API | Node + [oRPC](https://orpc.unnoq.com): typed procedures, Zod input/output schemas, OpenAPI handler. Swapped in for GraphQL — see decision 1. |
| Store | PostgreSQL + Prisma + Prisma Migrate. Typed rows and `include` for relations; the stats queries are raw SQL through `$queryRaw` with Zod-parsed rows, since they join and aggregate in ways the query builder cannot express (decision 5). |
| Web | Vite + React, oRPC client + TanStack Query, TanStack Router on browser history (navigation note in section 4), Tailwind + shadcn/ui. Types inferred from the server router, no codegen step. shadcn copies components into the repo, so the UI looks finished without a design budget. |
| Tests | Vitest. |
| Tooling | Biome for lint and format, rather than ESLint + Prettier: one tool and one config instead of eight dev dependencies, and no dependency on the TypeScript compiler API — which is what lets the workspace compile on TypeScript 7, since typescript-eslint does not support it. Given up: full type-aware linting, which only the compiler API can do (Biome infers types partially, so `noFloatingPromises` is on but is not the same rule as `no-floating-promises`), and YAML and HTML formatting, which Biome does not do at all. |

Prisma costs a `prisma generate` step (wired into install and dev) and cannot express everything: the rating `CHECK (rating BETWEEN 1 AND 5)` and the three stats queries (a grouped join, `jsonb_array_elements`, `unnest`) are hand-written SQL. The breakdowns would need raw SQL under any ORM. Case-insensitive user names are handled in the service (trim and lowercase before lookup and insert) rather than with a `lower(name)` index Prisma could neither declare nor use.

## 1. Decision log

**1. oRPC instead of GraphQL.** One client, twelve procedures, and every screen wants a fixed shape — field selection buys nothing here, and GraphQL would cost a schema builder, a codegen step and a normalised client cache in a four-hour budget. oRPC infers the client straight from the router, and the same Zod schemas that validate input produce the OpenAPI contract.

*What I gave up:* in GraphQL, `Collection.stats` would be a lazily resolved field the client asks for only when it needs it. With RPC there is no field selection, so the breakdowns ride along with every `collections.get` and the summary numbers with every `collections.list`. That is only acceptable because the stats are cheap at this scale (decision 5) — three aggregate queries over one collection's rows, and the list view's summary is one grouped query for all collections. If stats were expensive I would have to split them into their own procedure, which is exactly what field selection would have avoided. The mitigation is that procedures are thin wrappers over a transport-agnostic service layer, so putting GraphQL in front of the same services is a resolver-layer change, not a rewrite.

*Why oRPC over tRPC:* same DX plus first-class OpenAPI output and standard-schema support.

**2. Cache a TMDB snapshot at add-time, not at view-time.** Adding a movie calls TMDB `/movie/{id}` once and upserts title, overview, poster path, release date, runtime, genres and vote average into a `movies` table keyed by `tmdb_id`, with `fetched_at`. Viewing a collection then never touches TMDB.

*What I gave up:* the cached data goes stale. A TTL with background revalidation is a future work. What makes the trade easy is that search results carry `genre_ids` and no `runtime`, so add *has* to make a details call regardless — the snapshot is nearly free. Search results themselves are never persisted.

**3. Annotation lives on the membership row.** `collection_movies` is the join between a collection and a movie, and the note, tags and rating are columns on it. That is what makes "the same movie in two collections carries different annotations" fall out for free, with no extra table.

*What I gave up:* multiple users annotating one shared collection (the annotation is owned by the collection's owner, one per movie per collection), and any annotation history.

**4. Tags as a Postgres `text[]`, not a normalised table.** Cheap now, and `unnest` still gives a top-tags stat.

*What I gave up:* cross-collection tag queries, tag renames, and any canonical vocabulary — "sci-fi" and "scifi" are different tags forever. This is the first thing I would normalise if tags became a real feature rather than a label.

**5. Stats are computed on read, in SQL, not stored.** Nothing about a collection's stats is persisted. A `stats` module owns three queries: a summary (count, total runtime, average rating, rated count, min and max release year) over `collection_movies` joined to `movies`, a genre breakdown via `jsonb_array_elements`, and a tag breakdown via `unnest`. `collections.get` runs all three for one collection; `collections.list` runs the summary once, grouped by collection id, for every collection on the page.

*What I gave up:* read performance at scale. Precomputed counters on the collection row, maintained in the write transaction, would make the list view a plain row read and the detail summary free, at the price of derived state that can drift and needs a repair job. At one user with a few collections, an aggregate over a few hundred rows is correct by construction and costs nothing measurable, so the counters belong in the 100x section. I also gave up Prisma's typing: the three queries are raw SQL, and their row shapes are checked with Zod at the boundary rather than by the compiler.

*Why SQL and not TypeScript:* pulling every membership row into Node to count them is the same mistake as an N+1, one level up. Aggregation is what the database is for, and keeping the stats in SQL means the upgrade path — a cached stats row, or counters — stays in the same place.

*Which stats, and why these:* the brief leaves the choice open, so I picked the ones that answer the questions I actually ask of a list of films. Movie count and total runtime answer "how big is this, and can I get through it this weekend". Average rating with the rated count answers "how do I feel about what is in here so far", and the rated count stops a single 5-star from reading as a 5.0 collection. Release-year span says whether it is a period piece or a spread. The genre breakdown is TMDB's view of what the collection is about; the top tags are mine, and putting them side by side shows where they disagree. Skipped on purpose: TMDB's vote average (says what the internet thinks, which is not what a personal collection is for), popularity and language mix (nothing I would act on).

**6. Search is debounced in the browser, and the query cache does the rest.** The search input waits 300 ms after the last keystroke before the query key changes, using a ten-line hook rather than a scheduling library. Once a term has been fetched, TanStack Query caches it by key, so backspacing or retyping a term is free. That is the whole mitigation for the TMDB request budget today; a server-side cache is the 100x answer.

*What I gave up:* a fast typist still sees a 300 ms lag before results move, and the cache is not a debounce — every distinct term that survives the wait is one upstream request. Tuning the wait, or adding a throttle so continuous typing shows intermediate results, is future work.

**7. Name-only sign-in with an unsigned user-id cookie.** The requirement does not ask for auth but does say to assume multiple users, so I wanted the cheapest thing that exercises per-user scoping end to end. `auth.signIn` trims and lowercases the name, looks up or creates the user, and sets an `httpOnly`, `sameSite=lax` cookie holding the user id. A middleware reads it into context on every other procedure; every collection query is scoped by it.

*What I gave up:* security, deliberately and completely. No signing, no secret, no sessions table — anyone can set that cookie to any user id and read someone else's collections. It gives real per-user scoping in the schema, the queries and the UI for almost no effort. Because everything downstream depends only on `userId` in context, replacing this with real auth later touches `auth.signIn` and the middleware and nothing else.

**8. Posters load in the browser from TMDB's image CDN.** The API returns a full poster URL and the SPA puts it in an `<img>`. My reading of "the browser should never call TMDB directly" is that it is about the data API and the key — no credential is involved in an image request, and TMDB's terms allow hotlinking with attribution, which the footer carries.

*What I gave up:* users' browsers talk to a third-party host, an ad blocker can blank every poster, and poster availability depends on TMDB being up. The stored `poster_path` is size-agnostic, so moving to a CDN of my own later needs no migration.

## 2. What I would do with more time

### Knowingly left weak

Each of these is a trade-off argued in the decision log, not an oversight. The fix for each is in the list below.

- **No real auth** (decision 7) — the cookie is unsigned and trivially forged.
- **No TMDB refresh** (decision 2) — a movie's runtime or poster can change upstream and this app will never notice.
- **Stats recomputed on every read** (decision 5) — the breakdown queries cannot use an index, so they degrade with collection size.
- **Offset pagination.** `page`/`pageSize` on both lists can skip or repeat rows if rows change between page loads, and deep pages get slower because the database still walks what it skips. Offset is what the size of this app justifies.
- **Adding or removing a film refetches instead of patching the cache.** Annotations write optimistically, membership does not: an add or a remove invalidates the grid page and both collection queries. A membership patch has to reason about page boundaries and the stats arithmetic, while an annotation patch changes one field of a row already on screen.
- **Thin tests** (see Tests above) — three suites, nothing through the oRPC layer or the cookie.

### Next if this were real

- **Real auth**, in this order: password hash or OAuth inside `auth.signIn`, signed or server-side sessions, CSRF protection. All behind the existing `userId` context, so nothing downstream changes.
- **TTL refresh** on the `movies` snapshot, with background revalidation.
- **Search the local `movies` table first** (trigram index on title) alongside TMDB, so already-known films return instantly and the TMDB call budget drops; cache TMDB search responses on top.
- **Cursor pagination**, keyed on `(added_at, id)` for a collection's movies and `(created_at, id)` for the collections list — both already the sort order, so the index is there. Fixes the wobbling page boundary and the cost of deep pages in one change.
- **Cached or precomputed stats**, in the order set out in the 100x list below.
- **Filter and sort the grid by genre and year.** Cheap — a filter param on `collectionMovies.list`, and the existing stats chips become clickable. The stats strip stays collection-level; filters only narrow the grid, so the stats queries never need a filtered variant.
- **Tag normalisation** (decision 4).
- **A GraphQL facade** over the same services, if a second consumer ever makes field selection worth it.
- **Own CDN for posters** — copy from TMDB on first add, serve from an origin I control.
- **Tune the search debounce**, and add a throttle on top of it so continuous typing shows intermediate results instead of nothing until the 300 ms wait expires (decision 6).
- **Extend the optimistic cache patch from annotations to membership.** `add` already answers with the row, so it could be spliced into the cached page and the stats adjusted in place, the way `useUpdateAnnotation` does for a rating — the work is the page-boundary rule.

## 3. What breaks first at 100x

Fifty thousand users with large collections, ranked by what falls over first:

1. **The TMDB rate limit, via search.** One shared key across all users. TMDB's ceiling is somewhere around 40 requests per second; today the only mitigation is the client-side debounce and the query cache (decision 6). Fix: server-side result cache (Redis, short TTL) plus per-user rate limits, and serve hits from the local `movies` table before going upstream.
2. **Stats recomputed on every read.** The summary is a join and aggregate over every membership row, and the breakdowns (`jsonb_array_elements` over genres, `unnest` over tags) are not indexable, so all three degrade with collection size — and because there is no field selection, every list and detail view pays for them. That is decision 1's caveat coming due. Fix, in order: precomputed counters for the summary (`movie_count`, `rated_count`, `rating_sum`, `runtime_sum` on the collection row, updated in the write transaction, with a periodic recount job as the drift repair); then normalised genre and tag tables with per-collection count rows, or a cached breakdown invalidated on write.
3. **Postgres connection exhaustion** once the API runs as more than one process. Fix: PgBouncer or RDS Proxy, smaller per-instance pools.
4. **The `movies` snapshot** — unbounded growth and increasingly stale rows. Fix: the `fetched_at` TTL with background revalidation already on the list above.
5. **Offset pagination on deep pages.** Both lists walk and discard everything before the page they want. Fix: keyset on the sort column — `(added_at, id)` for movies, `(created_at, id)` for collections.
6. **No real auth, and unbounded user creation.** Anyone can create users and forge the cookie. Fix: real credentials, server-side sessions, rate limiting.

Already handled, so it is not on this list: movie lists are paginated, the list view's stats are one grouped query rather than one per collection, and posters are served by CDN.

## 4. Notes

**Time spent:** _to fill in_

**AI tools:** claude-code

**Ambiguities, and how I read them:**

- *"No Docker"* → no deployment work: no images for the app, no CI, no cloud. The compose file only starts Postgres, because "keep the build and run process simple" pulls the other way and a local database is the one prerequisite that is annoying to install by hand.
- *"Assume multiple users"* → real per-user scoping in the schema and every query, behind a name-only sign-in (decision 7). Not a client-side user switcher.
- *"Movie data lives in TMDB"* → the API caches a snapshot of display fields; TMDB stays the source of truth and those fields are never edited locally.
- *"Return a collection along with its movies and their annotations"* → two calls, not one: `collections.get` returns the collection and its stats, and `collectionMovies.list` returns the movies with their annotations, paginated. A large collection should not arrive in one response just to render the first screen. The detail view fires both in parallel, so it is still one round trip.
- *"Search must route through your API"* → search is an API procedure, and results are never persisted.
- *"The browser should never call TMDB directly"* → about the data API and the key. Poster images load from the public image CDN with attribution (decision 8).
- *"Annotations are user-owned"* → the collection's owner owns the annotation; one annotation per movie per collection.
- *Rating* → integer 1–5, nullable for unrated.
- *"The URL doesn't have to change"* → read as permission, not a constraint. The URL does change. Navigation note below.

**On navigation:** I weighed a single `view` state in the root component against a router. The state approach has the fewest moving parts, but every guard, param and "which page am I on" becomes hand-written, and the brief says the app will grow. TanStack Router costs one dependency and gives typed params, search params and the auth guard in one place. I run it on browser history because refresh survival and a linkable collection cost nothing extra, and the evaluator will refresh the page. Every view still has its own way back (header link to the list, explicit close controls on the search and annotation dialogs), so nothing depends on the back button. If the real requirement turns out to be that the URL must not change, swapping `createBrowserHistory()` for `createMemoryHistory()` in the router setup is a one-line change; routes, params, search params and the guard are untouched.
