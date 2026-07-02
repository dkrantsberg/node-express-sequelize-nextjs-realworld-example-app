// https://stackoverflow.com/questions/7697038/more-than-10-lines-in-a-node-js-stack-error
Error.stackTraceLimit = Infinity

import http from 'http'

import cors from 'cors'
import express, { Application, NextFunction, Request, Response } from 'express'
import session from 'express-session'
import methodOverride from 'method-override'
import morgan from 'morgan'
import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { ValidationError as SequelizeValidationError } from 'sequelize'

import config from './config'
import lib from './lib'
import { getSequelize, sync } from './models'
import routes from './routes'

/**
 * Start the standalone JSON API server.
 * - port: 0 means find a random empty port
 **/
async function start(
  port: number | string,
  cb?: (server: http.Server) => void | Promise<void>
): Promise<void> {
  const app: Application = express()

  const sequelize = getSequelize(__dirname)
  app.set('sequelize', sequelize)
  const UserModel: any = sequelize.models.User
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'user[email]',
        passwordField: 'user[password]',
      },
      function (email, password, done) {
        UserModel.findOne({ where: { email: email } })
          .then(function (user: any) {
            if (!user || !UserModel.validPassword(user, password)) {
              return done(null, false, {
                errors: { 'email or password': 'is invalid' },
              } as any)
            }
            return done(null, user)
          })
          .catch(done)
      }
    )
  )
  // The frontend is served from a separate origin (its own dev server / static
  // host), so CORS must stay enabled for the API to be reachable from it.
  app.use(cors())

  // Normal express config defaults
  if (config.verbose) {
    // https://stackoverflow.com/questions/42099925/logging-all-requests-in-node-js-express/64668730#64668730
    app.use(morgan('combined'))
  }
  app.use(express.urlencoded({ extended: false }))
  app.use(express.json())
  app.use(methodOverride())
  app.use(
    session({
      secret: config.secret,
      cookie: { maxAge: 60000 },
      resave: false,
      saveUninitialized: false,
    })
  )

  // Handle API routes.
  {
    const router = express.Router()
    router.use(config.apiPath, routes)
    app.use(router)
  }

  // 404 handler.
  app.use(function (req: Request, res: Response) {
    res.status(404).json('error: 404 Not Found')
  })

  // Error handlers
  app.use(function (
    err: Error,
    req: Request,
    res: Response,
    nextFn: NextFunction
  ) {
    // Automatiaclly handle Sequelize validation errors.
    if (err instanceof SequelizeValidationError) {
      if (!config.isProduction) {
        // The fuller errors can be helpful during development.
        console.error(err)
      }
      const errors: Record<string, string[]> = {}
      for (const errItem of err.errors) {
        let errorsForColumn = errors[errItem.path as string]
        if (errorsForColumn === undefined) {
          errorsForColumn = []
          errors[errItem.path as string] = errorsForColumn
        }
        errorsForColumn.push(errItem.message)
      }
      return res.status(422).json({ errors })
    } else if (err instanceof lib.ValidationError) {
      return res.status(err.status).json({
        errors: err.errors,
      })
    }
    return nextFn(err)
  })

  await sequelize.authenticate()
  // Just a convenience DB create so we don't have to force new users to do it manually.
  await sync(sequelize)
  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, async function (this: http.Server) {
      try {
        cb && (await cb(server))
      } catch (e) {
        reject(e)
        this.close()
        throw e
      }
    })
    server.on('close', async function () {
      await sequelize.close()
      resolve()
    })
  })
}

if (require.main === module) {
  start(config.port, (server) => {
    const address = server.address()
    const port = typeof address === 'string' ? address : address?.port
    console.log('Listening on: http://localhost:' + port)
  })
}

export { start }
export default { start }
