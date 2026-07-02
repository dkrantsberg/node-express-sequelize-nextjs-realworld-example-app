import { Router, Request, Response } from 'express'

import articles from './articles'
import profiles from './profiles'
import tags from './tags'
import users from './users'

const router = Router()

// heroku bootstrap
router.get('/', function (req: Request, res: Response) {
  res.json({ message: 'backend is up' })
})
router.use('/', users)
router.use('/profiles', profiles)
router.use('/articles', articles)
router.use('/tags', tags)

export default router
