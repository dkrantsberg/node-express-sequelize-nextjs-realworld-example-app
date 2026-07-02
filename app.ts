// https://stackoverflow.com/questions/7697038/more-than-10-lines-in-a-node-js-stack-error
Error.stackTraceLimit = Infinity

import http from 'http'

import cors from 'cors'
import express, { Application, NextFunction, Request, Response } from 'express'
import session from 'express-session'
import methodOverride from 'method-override'
import morgan from 'morgan'
import next from 'next'
import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { ValidationError as SequelizeValidationError } from 'sequelize'

import api from './api'
import config from './front/config'
import lib from './lib'
import { getSequelize, sync } from './models'

/**
 * - port: 0 means find random empty port
 * - startNext: if false, don't start Next.js, run just the API
 **/
async function start(
  port: number | string,
  startNext: boolean,
  cb?: (server: http.Server) => void | Promise<void>
): Promise<void> {
  const app: Application = express()
  let nextApp: ReturnType<typeof next> | undefined
  let nextHandle: ReturnType<ReturnType<typeof next>['getRequestHandler']>
  if (startNext) {
    nextApp = next({ dev: !config.isProductionNext })
    nextHandle = nextApp.getRequestHandler()
  }

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
  app.use(cors())

  // Normal express config defaults
  if (config.verbose) {
    // https://stackoverflow.com/questions/42099925/logging-all-requests-in-node-js-express/64668730#64668730
    app.use(morgan('combined'))
  }
  app.use(express.urlencoded({ extended: false }))
  app.use(express.json())
  app.use(methodOverride())

  // Next handles anything outside of /api.
  app.get(
    new RegExp('^(?!' + config.apiPath + '(/|$))'),
    function (req: Request, res: Response) {
      // We pass the sequelize that we have already created and connected to the database
      // so that the Next.js backend can just use that connection. This is in particular mandatory
      // if we wish to use SQLite in-memory database, because there is no way to make two separate
      // connections to the same in-memory database. In memory databases are used by the test system.
      req.sequelize = sequelize
      return nextHandle(req, res)
    }
  )
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
    router.use(config.apiPath, api)
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

  if (startNext && nextApp) {
    await nextApp.prepare()
  }
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
  start(config.port, true, (server) => {
    const address = server.address()
    const port = typeof address === 'string' ? address : address?.port
    console.log('Listening on: http://localhost:' + port)
  })
}

export { start }
export default { start }
