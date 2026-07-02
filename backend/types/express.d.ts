// Augment Express's Request with the extra properties this app attaches to it.
//
// - `sequelize`: the shared Sequelize instance, set by the custom server (app.ts)
//   so Next.js data functions and API routes reuse the same DB connection.
// - `payload`: the decoded JWT, set by express-jwt (configured with
//   `requestProperty: 'payload'` in auth.ts).
// - `article` / `comment` / `profile`: objects preloaded by `router.param(...)`
//   handlers in the API routes.
//
// These are intentionally typed loosely (`any`) because they are accessed through
// the stringly-typed `sequelize.models.X` registry throughout the route handlers.

import 'express'

declare global {
  namespace Express {
    interface Request {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sequelize?: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload?: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      auth?: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      article?: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comment?: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profile?: any
    }
  }
}
