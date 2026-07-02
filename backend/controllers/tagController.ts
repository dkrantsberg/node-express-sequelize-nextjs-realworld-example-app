import { NextFunction, Request, Response } from 'express'

import lib from '../lib'

// Return the list of tags.
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    return res.json({
      tags: await lib.getIndexTags(req.app.get('sequelize')),
    })
  } catch (error) {
    next(error)
  }
}
