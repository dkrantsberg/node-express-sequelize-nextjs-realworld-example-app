import { NextFunction, Request, Response } from 'express'

// Preload the user profile referenced by a ':username' route param.
export function preloadUsername(
  req: Request,
  res: Response,
  next: NextFunction,
  username: string
) {
  req.app
    .get('sequelize')
    .models.User.findOne({ where: { username: username } })
    .then(function (user: unknown) {
      if (!user) {
        return res.sendStatus(404)
      }
      req.profile = user
      return next()
    })
    .catch(next)
}

// Get a user's public profile.
export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let toProfileJSONForUser
    if (req.payload) {
      const user = await req.app
        .get('sequelize')
        .models.User.findByPk(req.payload.id)
      if (user) {
        toProfileJSONForUser = user
      } else {
        toProfileJSONForUser = false
      }
    } else {
      toProfileJSONForUser = false
    }
    return res.json({
      profile: await req.profile.toProfileJSONFor(toProfileJSONForUser),
    })
  } catch (error) {
    next(error)
  }
}

// Follow a user.
export async function follow(req: Request, res: Response, next: NextFunction) {
  try {
    const profileId = req.profile.id
    const user = await req.app
      .get('sequelize')
      .models.User.findByPk(req.payload.id)
    if (!user) {
      return res.sendStatus(401)
    }
    await user.addFollow(profileId)
    // TODO same as ArticleTag
    //await lib.deleteOldestForDemo(req.app.get('sequelize').models.UserFollowUser)
    return res.json({ profile: await req.profile.toProfileJSONFor(user) })
  } catch (error) {
    next(error)
  }
}

// Unfollow a user.
export async function unfollow(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const profileId = req.profile.id
    const user = await req.app
      .get('sequelize')
      .models.User.findByPk(req.payload.id)
    if (!user) {
      return res.sendStatus(401)
    }
    await user.removeFollow(profileId)
    return res.json({ profile: await req.profile.toProfileJSONFor(user) })
  } catch (error) {
    next(error)
  }
}
