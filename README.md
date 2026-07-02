# Node.js + Express + Sequelize + Next.js RealWorld example app

A fullstack TypeScript implementation of the [RealWorld](https://github.com/gothinkster/realworld) spec ("Conduit"): a Medium-style blogging platform with articles, comments, tags, favorites, following, and JWT auth.

Both the REST API and the Next.js frontend are served from a **single custom Next.js server**, and the app runs on **SQLite** for local development and **PostgreSQL** in production.

## Tech stack

- **Runtime:** Node.js `>=20` (developed on Node 22), TypeScript executed directly via [`tsx`](https://github.com/privatenumber/tsx) — there is no separate backend build step.
- **Server:** Express 4 + a [Next.js 12 custom server](https://nextjs.org/docs/advanced-features/custom-server). Next handles everything outside `/api`; Express handles `/api/*`.
- **ORM:** Sequelize 6 with class-based models (`class extends Model` + `InferAttributes`).
- **Auth:** JWT (`express-jwt` + `jsonwebtoken`), via a header token and, for safe GET requests, a cookie.
- **Frontend:** React 17 + Next.js, rendered with ISR by default.

## Architecture

Everything runs in one process from [`app.ts`](app.ts):

- **One Express app** mounts the API router under `/api` and forwards every other request to the Next.js request handler.
- **One shared Sequelize instance** is created at startup and passed to Next.js requests as `req.sequelize`. Sharing a single connection is mandatory for the in-memory SQLite database used by the test suite (you cannot open two connections to the same in-memory DB).
- The boundary between "frontend" and "backend" is deliberately blurred. Files under [`pages/`](pages) and [`back/`](back) contain Next.js data functions (`getStaticProps` / `getStaticPaths` / `getServerSideProps`) that talk to the database **directly** through Sequelize, without going through the HTTP API.

### ISR and user-specific data

The app is ISR (Incremental Static Regeneration) by default. Pages are prerendered as if logged out and cached; user-specific details (e.g. "do I follow this author", "have I favorited this article") are patched in by client-side API calls after the static page loads. A partial SSR variant lives under the `/ssr` route prefix.

### Authentication

JWT authentication happens two ways:

- **`Authorization` header** (standard JWT) — sent to the API routes, stored in `localStorage`, requires JavaScript.
- **Cookie** — a copy of the JWT used only for safe HTTP methods (GET), so `getServerSideProps` can render a logged-in page on first load. Because the cookie is only used for safe methods, no CSRF synchronizer token is needed.

## Directory structure

```
app.ts                 Custom server entry point (Express + Next.js)
auth.ts                express-jwt middleware (auth.required / auth.optional)
lib.ts                 Shared backend helpers (validation, ValidationError, tags)
db.ts                  Shared Sequelize singleton used by Next.js data functions
api/                   Express REST API routers (articles, users, profiles, tags)
models/                Sequelize class models + getSequelize()/sync() in index.ts
migrations/            Sequelize CLI migrations (plain .js, run via sequelize-cli)
bin/
  sync-db.ts           Create/migrate the DB (run before `next build`)
  generate-demo-data.ts  Seed the DB with demo data
back/                  Backend Next.js data functions (getStaticProps, etc.)
front/                 Code importable by the frontend (components, API client, config)
front/config.ts        Shared config (backend, frontend, and sequelize-cli)
pages/                 Next.js pages (mix of frontend + direct DB access)
types/express.d.ts     Express Request augmentation (sequelize, payload, ...)
test.ts, test_lib.ts   Mocha test suite and data-generation helpers
```

Rule of thumb: anything under `front/` is safe to import from the browser; everything else is backend-only.

## Local development with SQLite

```
npm install --legacy-peer-deps
npm run dev
```

Then visit http://localhost:3000. Both the API and the pages are served from that single server. `npm run dev` runs [`app.ts`](app.ts) through `tsx` under `nodemon`, restarting on backend changes.

The SQLite database is stored at `db.sqlite3`. `--legacy-peer-deps` is needed because `swr@0.3` declares a React 16 peer while the app uses React 17.

To populate the database with demo data, see [Generate demo data](#generate-demo-data).

### Optimized frontend (SQLite)

Runs the prebuilt, production-optimized Next.js frontend while still using SQLite:

```
npm run build-dev
npm run start-dev
```

Changes to code under `pages/` (and other server-only code such as `getStaticPaths`) require a rebuild to take effect in this mode.

Two project-specific environment variables control this:

- `NEXT_PUBLIC_NODE_ENV=development` — makes the app behave as development (SQLite, no analytics) even when the Next.js server itself runs in production mode. Falls back to `NODE_ENV` if unset.
- `NODE_ENV_NEXT_SERVER_ONLY=production` — forces only the Next.js server (dev vs prod) into production mode, without affecting the database or in-browser behavior.

### Development server on PostgreSQL

Set up a local PostgreSQL database, then:

```
npm run dev-pg
```

To run other DB commands against PostgreSQL, export `REALWORLD_PG=true`:

```
REALWORLD_PG=true npx tsx bin/sync-db.ts
REALWORLD_PG=true npx tsx bin/generate-demo-data.ts
```

### Production build (PostgreSQL)

`npm run build` / `npm start` target PostgreSQL (the production database). For a local production-parity run:

```
npm run build-prod
npm run start-prod
```

## Generate demo data

> This first erases any data in the database.

```
./bin/generate-demo-data.ts
```

(or `npx tsx bin/generate-demo-data.ts`). You can then log in with users such as `user0@mail.com` … `user9@mail.com`, all with password `asdf`.

The data size is configurable:

```
./bin/generate-demo-data.ts --n-users 5 --n-articles-per-user 8 --n-follows-per-user 3
```

Create an empty (truncated) database instead:

```
./bin/generate-demo-data.ts --empty
```

## Database migrations

Migrations live under [`migrations/`](migrations) and are run by `sequelize-cli`. Pending migrations are applied automatically as part of the build via [`bin/sync-db.ts`](bin/sync-db.ts).

If the database does not exist yet, `sync-db` instead creates it directly from the current model definitions and records all existing migrations in the `SequelizeMeta` table (so Sequelize treats them as already applied).

`sequelize-cli` reads the shared config from [`front/config.ts`](front/config.ts); [`.sequelizerc`](.sequelizerc) registers the `tsx` loader so the CLI can read that TypeScript config.

## Testing

The tests are in [`test.ts`](test.ts) and run with Mocha (via `tsx`, configured in `.mocharc.json`):

```
npm test
```

They cover two kinds of tests:

- **API tests** — start the full server on a random port and exercise the REST API end to end.
- **Unit tests** — call model/DB functions directly.

Useful variants:

```
npm test -- -g 'substring of test title'   # run a single test
npm run test-pg                             # run against PostgreSQL
npm run test-next                           # also run tests that hit Next.js pages
DEBUG='sequelize:sql:*' npm test            # show all SQL queries
```

By default the SQLite tests run on a fresh in-memory database. Hitting Next.js pages is opt-in (`test-next`) because it requires a production build and is slow.

## Linting and type-checking

```
npm run tsc      # TypeScript type-check (no emit)
npm run lint     # ESLint (includes Prettier checks)
npm run format   # auto-fix formatting with Prettier
```

`npm run build-dev` runs the type-check and lint as part of the Next.js build.

## Debugging

Enable extra request logging:

```
VERBOSE=1 npm run dev
```

Log all database queries:

```
DEBUG='sequelize:sql:*' npm run start-dev
```

Prevent the browser from opening automatically:

```
BROWSER=none npm run dev
```
