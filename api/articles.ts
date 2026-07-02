import { NextFunction, Request, Response, Router } from 'express'
import { Transaction } from 'sequelize'

import auth from '../auth'
import config from '../front/config'
import lib from '../lib'

const router = Router()

async function setArticleTags(
  req: Request,
  article: any,
  tagList: string[],
  transaction: Transaction
) {
  await req.app.get('sequelize').models.Tag.bulkCreate(
    tagList.map((tag) => {
      return { name: tag }
    }),
    {
      ignoreDuplicates: true,
      transaction,
    }
  )
  // IDs may be missing from the above, so we have to do a find.
  // https://github.com/sequelize/sequelize/issues/11223#issuecomment-864185973
  const tags2 = await req.app.get('sequelize').models.Tag.findAll({
    where: { name: tagList },
    transaction,
  })
  return article.setTags(tags2, { transaction })
}

function validateArticle(
  req: Request,
  res: Response,
  article: any,
  tagList?: string[]
): string | undefined {
  let ret
  if (typeof tagList !== 'undefined') {
    if (config.isDemo) {
      if (tagList.length > 10) {
        ret = `too many tags: ${tagList.length}`
      }
      for (const tag of tagList) {
        if (config.blacklistTags.has(tag.toLowerCase())) {
          ret = `blacklisted tag: ${tag}`
        }
      }
    }
  }
  return ret
}

// Preload article objects on routes with ':article'
router.param(
  'article',
  function (req: Request, res: Response, next: NextFunction, slug: string) {
    req.app
      .get('sequelize')
      .models.Article.findOne({
        where: { slug: slug },
        include: [
          { model: req.app.get('sequelize').models.User, as: 'author' },
        ],
      })
      .then(function (article: unknown) {
        if (!article) {
          return res.sendStatus(404)
        }
        req.article = article
        return next()
      })
      .catch(next)
  }
)

router.param(
  'comment',
  function (req: Request, res: Response, next: NextFunction, id: string) {
    req.app
      .get('sequelize')
      .models.Comment.findOne({
        where: { id: id },
        include: [
          { model: req.app.get('sequelize').models.User, as: 'author' },
        ],
      })
      .then(function (comment: unknown) {
        if (!comment) {
          return res.sendStatus(404)
        }
        req.comment = comment
        return next()
      })
      .catch(next)
  }
)

router.get(
  '/',
  auth.optional,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const query = {}
      const limit = lib.validateParam(
        req.query,
        'limit',
        lib.validatePositiveInteger,
        20
      )
      const offset = lib.validateParam(
        req.query,
        'offset',
        lib.validatePositiveInteger,
        0
      )
      const include = []

      const loggedUserId = req.payload ? req.payload.id : undefined

      // Author include.
      const authorInclude: any = {
        model: req.app.get('sequelize').models.User,
        as: 'author',
      }
      if (req.query.author) {
        authorInclude.where = { username: req.query.author }
      }
      include.push(authorInclude)

      let favoritedPrecalc = false
      if (req.query.favorited) {
        // Select only posts that have been favorited by this given.
        include.push({
          model: req.app.get('sequelize').models.User,
          as: 'favoritedBy',
          where: { username: req.query.favorited },
        })
      } else if (loggedUserId) {
        // Add "did the logged in user favorite this post" to the JOIN to not have to
        // do it individually article by article.
        // https://github.com/cirosantilli/node-express-sequelize-nextjs-realworld-example-app/issues/5
        include.push({
          model: req.app.get('sequelize').models.UserFavoriteArticle,
          where: { userId: req.payload.id },
          required: false,
          include: [
            {
              model: req.app.get('sequelize').models.User,
            },
          ],
        })
        favoritedPrecalc = true
      }

      // Tag include.
      if (req.query.tag) {
        const tagInclude: any = {
          model: req.app.get('sequelize').models.Tag,
          as: 'tags',
        }
        tagInclude.where = { name: req.query.tag }
        include.push(tagInclude)
      }

      const [{ count: articlesCount, rows: articles }, user] =
        await Promise.all([
          req.app.get('sequelize').models.Article.findAndCountAll({
            where: query,
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            include,
          }),
          req.payload
            ? req.app.get('sequelize').models.User.findByPk(loggedUserId)
            : null,
        ])
      return res.json({
        articles: await Promise.all(
          articles.map((article: any) => {
            const tags = req.query.tag ? undefined : article.tags
            const favorited = favoritedPrecalc
              ? !!article.UserFavoriteArticles.length
              : undefined
            return article.toJson(user, { tags, favorited })
          })
        ),
        articlesCount: articlesCount,
      })
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/feed',
  auth.required,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const limit = lib.validateParam(
        req.query,
        'limit',
        lib.validatePositiveInteger,
        20
      )
      const offset = lib.validateParam(
        req.query,
        'offset',
        lib.validatePositiveInteger,
        0
      )
      const user = await req.app
        .get('sequelize')
        .models.User.findByPk(req.payload.id)
      if (!user) {
        return res.sendStatus(401)
      }
      return res.json(
        await user.findAndCountArticlesByFollowedToJson(offset, limit)
      )
    } catch (error) {
      next(error)
    }
  }
)

// Create article
router.post(
  '/',
  auth.required,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const user = await req.app
        .get('sequelize')
        .models.User.findByPk(req.payload.id)
      if (!user) {
        return res.sendStatus(401)
      }
      if (!req.body.article) {
        return res.status(422).json({ errors: { article: "can't be blank" } })
      }
      const article = new (req.app.get('sequelize').models.Article)(
        req.body.article
      )
      article.authorId = user.id
      const tagList = req.body.article.tagList
      if (validateArticle(req, res, article, tagList)) return
      await req.app
        .get('sequelize')
        .transaction(
          { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
          async (transaction: Transaction) => {
            await Promise.all([
              article.save({ transaction }),
              setArticleTags(req, article, tagList, transaction),
            ])
          }
        )
      await Promise.all([
        lib.deleteOldestForDemo(req.app.get('sequelize').models.Article),
        lib.deleteOldestForDemo(req.app.get('sequelize').models.Tag),
      ])
      article.author = user
      return res.json({ article: await article.toJson(user) })
    } catch (error) {
      next(error)
    }
  }
)

// Get article
router.get(
  '/:article',
  auth.optional,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const results = await Promise.all([
        req.payload
          ? req.app.get('sequelize').models.User.findByPk(req.payload.id)
          : null,
        req.article.getAuthor(),
      ])
      const [user] = results
      return res.json({ article: await req.article.toJson(user) })
    } catch (error) {
      next(error)
    }
  }
)

// Update article
router.put(
  '/:article',
  auth.required,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const user = await req.app
        .get('sequelize')
        .models.User.findByPk(req.payload.id)
      if (req.article.authorId.toString() === req.payload.id.toString()) {
        const article = req.article
        if (req.body.article) {
          if (typeof req.body.article.title !== 'undefined') {
            article.title = req.body.article.title
          }
          if (typeof req.body.article.description !== 'undefined') {
            article.description = req.body.article.description
          }
          if (typeof req.body.article.body !== 'undefined') {
            article.body = req.body.article.body
          }
          const tagList = req.body.article.tagList
          if (validateArticle(req, res, article, tagList)) return
          await req.app
            .get('sequelize')
            .transaction(
              { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
              async (transaction: Transaction) => {
                await article.deleteEmptyTags(transaction)
                await Promise.all([
                  typeof tagList === 'undefined'
                    ? null
                    : setArticleTags(req, article, tagList, transaction),
                  article.save({ transaction }),
                ])
              }
            )
        }
        return res.json({ article: await article.toJson(user) })
      } else {
        return res.sendStatus(403)
      }
    } catch (error) {
      next(error)
    }
  }
)

// Delete article
router.delete(
  '/:article',
  auth.required,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.app.get('sequelize').models.User.findByPk(req.payload.id)
      if (!user) {
        return res.sendStatus(401)
      }
      if (req.article.author.id.toString() === req.payload.id.toString()) {
        await req.article.destroy2()
        return res.sendStatus(204)
      } else {
        return res.sendStatus(403)
      }
    } catch (error) {
      next(error)
    }
  }
)

// Favorite an article
router.post(
  '/:article/favorite',
  auth.required,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const articleId = req.article.id
      const [user, article] = await Promise.all([
        req.app.get('sequelize').models.User.findByPk(req.payload.id),
        req.app.get('sequelize').models.Article.findByPk(articleId),
      ])
      if (!user) {
        return res.sendStatus(401)
      }
      if (!article) {
        return res.sendStatus(404)
      }
      await user.addFavorite(articleId)
      // TODO same as ArticleTag
      //await lib.deleteOldestForDemo(req.app.get('sequelize').models.UserFavoriteArticle)
      return res.json({ article: await article.toJson(user) })
    } catch (error) {
      next(error)
    }
  }
)

// Unfavorite an article
router.delete(
  '/:article/favorite',
  auth.required,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const articleId = req.article.id
      const [user, article] = await Promise.all([
        req.app.get('sequelize').models.User.findByPk(req.payload.id),
        req.app.get('sequelize').models.Article.findByPk(articleId),
      ])
      if (!user) {
        return res.sendStatus(401)
      }
      if (!article) {
        return res.sendStatus(404)
      }
      await user.removeFavorite(articleId)
      return res.json({ article: await article.toJson(user) })
    } catch (error) {
      next(error)
    }
  }
)

// Return an article's comments
router.get(
  '/:article/comments',
  auth.optional,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      let user
      if (req.payload) {
        user = await req.app
          .get('sequelize')
          .models.User.findByPk(req.payload.id)
      } else {
        user = null
      }
      const comments = await req.article.getComments({
        order: [['createdAt', 'DESC']],
        include: [
          { model: req.app.get('sequelize').models.User, as: 'author' },
        ],
      })
      return res.json({
        comments: await Promise.all(
          comments.map(function (comment: any) {
            return comment.toJson(user)
          })
        ),
      })
    } catch (error) {
      next(error)
    }
  }
)

// Create a new comment
router.post(
  '/:article/comments',
  auth.required,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const user = await req.app
        .get('sequelize')
        .models.User.findByPk(req.payload.id)
      if (!user) {
        return res.sendStatus(401)
      }
      if (!req.body.comment) {
        return res.status(422).json({ errors: { comment: "can't be blank" } })
      }
      const comment = await req.app.get('sequelize').models.Comment.create(
        Object.assign({}, req.body.comment, {
          articleId: req.article.id,
          authorId: user.id,
        })
      )
      await lib.deleteOldestForDemo(req.app.get('sequelize').models.Comment)
      comment.author = user
      return res.json({ comment: await comment.toJson(user) })
    } catch (error) {
      next(error)
    }
  }
)

// Delete a comment
router.delete(
  '/:article/comments/:comment',
  auth.required,
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const author = await req.comment.getAuthor()
      if (author.id.toString() === req.payload.id.toString()) {
        await req.comment.destroy()
        return res.sendStatus(204)
      } else {
        res.sendStatus(403)
      }
    } catch (error) {
      next(error)
    }
  }
)

export default router
