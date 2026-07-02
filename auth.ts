import { Request } from 'express'
import { expressjwt } from 'express-jwt'

import config from './front/config'

const secret = config.secret

function getTokenFromHeader(authorization?: string): string | undefined {
  if (
    (authorization && authorization.split(' ')[0] === 'Token') ||
    (authorization && authorization.split(' ')[0] === 'Bearer')
  ) {
    return authorization.split(' ')[1]
  }
  return undefined
}

function getTokenFromRequest(req: Request): string | undefined {
  const ret = getTokenFromHeader(req.headers.authorization)
  if (ret) return ret
  // If one day we want to allow API GET requests with the cookie.
  // Does not work for Next.js routes.
  return undefined
}

export const required = expressjwt({
  secret,
  algorithms: ['HS256'],
  requestProperty: 'payload',
  getToken: getTokenFromRequest,
})

export const optional = expressjwt({
  secret,
  algorithms: ['HS256'],
  requestProperty: 'payload',
  credentialsRequired: false,
  getToken: getTokenFromRequest,
})

export default { required, optional }
