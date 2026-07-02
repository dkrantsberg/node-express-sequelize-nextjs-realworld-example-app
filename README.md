# Node.js + Express + Sequelize + React RealWorld example app

An implementation of the [RealWorld](https://github.com/gothinkster/realworld) spec ("Conduit"): a Medium-style blogging platform with articles, comments, tags, favorites, following, and JWT auth.

The project is split into two **independent packages**:

- [`backend/`](backend) — a TypeScript **Express + Sequelize JSON API** (no frontend, no Next.js). Runs on **SQLite** for local development and **PostgreSQL** in production.
- [`frontend/`](frontend) — a **React single-page app** built with **Vite** and **React Router**, written in **JavaScript (JSX)**. It talks to the backend only over the `/api` HTTP interface.

The two run as separate processes on separate ports. In development the Vite dev server proxies `/api` to the backend.

## Tech stack

**Backend** ([`backend/`](backend))
- Node.js `>=20`, TypeScript executed directly via [`tsx`](https://github.com/privatenumber/tsx) — no separate build step.
- Express 4 REST API mounted under `/api`.
- Sequelize 6 with class-based models (`class extends Model`).
- JWT auth via `express-jwt` + `jsonwebtoken` (token in the `Authorization` header).

**Frontend** ([`frontend/`](frontend))
- React 17 + [React Router 6](https://reactrouter.com/) for client-side routing.
- [Vite 5](https://vitejs.dev/) dev server / bundler.
- [SWR](https://swr.vercel.app/) + [axios](https://axios-http.com/) for data fetching against the API.
- Its own plain-JS model classes ([`frontend/src/models/`](frontend/src/models)) — deliberately **not** shared with the backend Sequelize models.

## Architecture

There is a clean HTTP boundary between the two packages:

- The **backend** is a plain JSON API. Its entry point [`backend/app.ts`](backend/app.ts) builds one Express app, creates a single shared Sequelize instance, mounts the API under `/api`, and returns 404 for anything else. It never renders HTML. Routing is split: [`backend/routes.ts`](backend/routes.ts) declares every HTTP route (method, path, auth middleware, param preloaders) and maps each to a handler in [`backend/controllers/`](backend/controllers) (one module per resource).
- The **frontend** is a static SPA. [`frontend/src/main.jsx`](frontend/src/main.jsx) mounts the app into `index.html`; [`frontend/src/App.jsx`](frontend/src/App.jsx) defines the routes and the shared shell (navbar, footer, global state). Pages fetch their data client-side from `/api` via SWR/axios.
- The frontend defines **its own models** in [`frontend/src/models/`](frontend/src/models) (`Article`, `User`, `Comment`). API responses are wrapped into these classes at the fetch boundary, so components never depend on backend types.

### Authentication

JWT authentication is header-based: on login/register the token is stored in `localStorage` and sent as an `Authorization: Token <jwt>` header on subsequent API requests. A copy of the token is also kept in a cookie so the SPA can detect logged-in state on first load.

## Directory structure

```
backend/                TypeScript Express + Sequelize JSON API
  app.ts                Server entry point (builds the Express app, API only)
  routes.ts             Declares every HTTP route (method + path + auth) -> controller
  controllers/          Route handler modules (one per resource)
    articleController.ts   Articles, comments, favorites (+ :article/:comment preloaders)
    userController.ts      Current user, update, login, register
    profileController.ts   Profiles, follow/unfollow (+ :username preloader)
    tagController.ts       Tag list
  config.ts             Backend config (DB, secret, port; also read by sequelize-cli)
  auth.ts               express-jwt middleware (auth.required / auth.optional)
  lib.ts                Backend helpers (validation, ValidationError, tags)
  db.ts                 Shared Sequelize singleton
  models/               Sequelize class models + getSequelize()/sync() in index.ts
  migrations/           Sequelize CLI migrations (plain .js)
  bin/
    sync-db.ts          Create/migrate the DB
    generate-demo-data.ts  Seed the DB with demo data
  types/express.d.ts    Express Request augmentation (sequelize, payload, ...)
  test.ts, test_lib.ts  Mocha test suite and data-generation helpers

frontend/               Vite + React + React Router SPA (JavaScript/JSX)
  index.html            HTML entry point
  vite.config.js        Vite config + dev proxy (/api -> backend)
  src/
    main.jsx            Mounts <App/>, imports global CSS
    App.jsx             Routes + app shell (SWRConfig, context, navbar, footer)
    config.js           Frontend config (apiPath, appName, ...)
    auth.js             Cookie + localStorage auth helpers
    routes.js           Route path builders
    useLoggedInUser.js  Hook resolving the current user from cookie/localStorage
    api/                axios API clients + SWR fetcher
    models/             Frontend model classes (Article, User, Comment)
    components/         Reusable UI components
    pages/              Route-level page components
    styles/             Global SCSS/CSS
```

## Local development

Run the two packages in separate terminals.

**1. Backend API** (SQLite, port 3000):

```
cd backend
npm install
npm run dev
```

This runs [`backend/app.ts`](backend/app.ts) through `tsx` under `nodemon`, restarting on changes. The SQLite database is stored at `backend/db.sqlite3`. The API is at http://localhost:3000/api.

**2. Frontend SPA** (Vite, port 5173):

```
cd frontend
npm install
npm run dev
```

Then visit http://localhost:5173. The Vite dev server proxies `/api/*` to the backend at `http://localhost:3000` (override with the `VITE_API_TARGET` env var).

> `frontend/` includes an `.npmrc` with `legacy-peer-deps=true` because `swr@0.3` declares a React 16 peer while the app uses React 17; it runs fine on React 17.

### Frontend production build

```
cd frontend
npm run build      # outputs to frontend/dist
npm run preview     # serve the built bundle locally
```

The built SPA is static; serve `frontend/dist` from any static host and point it (or a reverse proxy) at the backend's `/api`.

### Backend on PostgreSQL

Set up a local PostgreSQL database, then:

```
cd backend
npm run dev-pg
```

To run other DB commands against PostgreSQL, export `REALWORLD_PG=true`:

```
cd backend
REALWORLD_PG=true npx tsx bin/sync-db.ts
REALWORLD_PG=true npx tsx bin/generate-demo-data.ts
```

`npm start` (in `backend/`) runs the API in production mode against PostgreSQL.

## Generate demo data

> This first erases any data in the database.

From the `backend/` directory:

```
npm run seed
```

(equivalent to `npx tsx bin/generate-demo-data.ts`). You can then log in with users `user0@mail.com` … `user9@mail.com`, all with password `asdf`.

The data size is configurable (pass flags after `--`):

```
npm run seed -- --n-users 5 --n-articles-per-user 8 --n-follows-per-user 3
```

Create an empty (truncated) database instead:

```
npm run seed -- --empty
```

## Database migrations

Migrations live under [`backend/migrations/`](backend/migrations) and are run by `sequelize-cli`. [`backend/bin/sync-db.ts`](backend/bin/sync-db.ts) applies pending migrations, or — if the database does not exist yet — creates it directly from the current model definitions and records all migrations in the `SequelizeMeta` table (so Sequelize treats them as already applied):

```
cd backend
npm run sync-db
```

`sequelize-cli` reads the shared config from [`backend/config.ts`](backend/config.ts); [`backend/.sequelizerc`](backend/.sequelizerc) registers the `tsx` loader so the CLI can read that TypeScript config.

## Testing

Backend tests are in [`backend/test.ts`](backend/test.ts) and run with Mocha (via `tsx`, configured in `.mocharc.json`):

```
cd backend
npm test
```

They cover two kinds of tests:

- **API tests** — start the API on a random port and exercise the REST endpoints end to end.
- **Unit tests** — call model/DB functions directly.

Useful variants:

```
npm test -- -g 'substring of test title'   # run a single test
npm run test-pg                             # run against PostgreSQL
DEBUG='sequelize:sql:*' npm test            # show all SQL queries
```

By default the SQLite tests run on a fresh in-memory database.

## Linting and type-checking

Backend:

```
cd backend
npm run tsc      # TypeScript type-check (no emit)
npm run format   # auto-fix formatting with Prettier
```

Frontend:

```
cd frontend
npm run format   # auto-fix formatting with Prettier
```

## Debugging

Enable extra request logging on the backend:

```
cd backend
VERBOSE=1 npm run dev
```

Log all database queries:

```
cd backend
DEBUG='sequelize:sql:*' npm run dev
```
