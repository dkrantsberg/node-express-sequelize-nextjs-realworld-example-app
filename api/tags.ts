import { NextFunction, Request, Response, Router } from 'express'

import lib from '../lib'

const router = Router()

// return a list of tags
router.get(
  '/',
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({
        tags: await lib.getIndexTags(req.app.get('sequelize')),
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router
