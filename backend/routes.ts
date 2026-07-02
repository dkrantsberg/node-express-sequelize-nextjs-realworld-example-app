import { Request, Response, Router } from 'express'

import auth from './auth'
import * as articles from './controllers/articleController'
import * as profiles from './controllers/profileController'
import * as tags from './controllers/tagController'
import * as users from './controllers/userController'

// All HTTP routes for the API are declared here. Handler logic lives in the
// controllers under ./controllers; this file only maps method + path (+ auth
// middleware and param preloaders) to a controller function.
const router = Router()

// Route param preloaders. These run whenever a matched route contains the
// corresponding ':param', populating req.article / req.comment / req.profile.
router.param('article', articles.preloadArticle)
router.param('comment', articles.preloadComment)
router.param('username', profiles.preloadUsername)

// Health check (heroku bootstrap).
router.get('/', function (req: Request, res: Response) {
  res.json({ message: 'backend is up' })
})

// Users & authentication.
router.get('/user', auth.required, users.getCurrentUser)
router.put('/user', auth.required, users.updateUser)
router.post('/users/login', users.login)
router.post('/users', users.register)

// Profiles.
router.get('/profiles/:username', auth.optional, profiles.getProfile)
router.post('/profiles/:username/follow', auth.required, profiles.follow)
router.delete('/profiles/:username/follow', auth.required, profiles.unfollow)

// Articles. NOTE: '/articles/feed' must be declared before '/articles/:article'
// so the literal 'feed' segment is not captured as an :article slug.
router.get('/articles', auth.optional, articles.list)
router.get('/articles/feed', auth.required, articles.feed)
router.post('/articles', auth.required, articles.create)
router.get('/articles/:article', auth.optional, articles.get)
router.put('/articles/:article', auth.required, articles.update)
router.delete('/articles/:article', auth.required, articles.deleteArticle)
router.post('/articles/:article/favorite', auth.required, articles.favorite)
router.delete('/articles/:article/favorite', auth.required, articles.unfavorite)
router.get('/articles/:article/comments', auth.optional, articles.listComments)
router.post(
  '/articles/:article/comments',
  auth.required,
  articles.createComment
)
router.delete(
  '/articles/:article/comments/:comment',
  auth.required,
  articles.deleteComment
)

// Tags.
router.get('/tags', tags.list)

export default router
