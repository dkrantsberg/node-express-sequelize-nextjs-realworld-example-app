import fs from 'fs'
import path from 'path'

import { DatabaseError, Options, Sequelize, SyncOptions } from 'sequelize'

import config from '../front/config'
import { Article } from './article'
import { Comment } from './comment'
import { associateModels } from './relationships'
import { SequelizeMeta } from './sequelize_meta'
import { Tag } from './tag'
import { User } from './user'
import { UserFavoriteArticle } from './user_favorite_article'
import { UserFollowUser } from './user_follow_user'

export function getSequelize(
  toplevelDir?: string,
  toplevelBasename?: string
): Sequelize {
  const sequelizeParams: Options = {
    logging: config.verbose ? console.log : false,
    define: {
      freezeTableName: true,
    },
  }
  let sequelize: Sequelize
  if (config.isProduction || config.postgres) {
    sequelizeParams.dialect = config.production.dialect as 'postgres'
    sequelizeParams.dialectOptions = config.production.dialectOptions
    sequelize = new Sequelize(config.production.url, sequelizeParams)
  } else {
    sequelizeParams.dialect = config.development.dialect as 'sqlite'
    let storage: string
    if (process.env.NODE_ENV === 'test' || toplevelDir === undefined) {
      storage = ':memory:'
    } else {
      if (toplevelBasename === undefined) {
        toplevelBasename = config.development.storage
      }
      storage = path.join(toplevelDir, toplevelBasename)
    }
    sequelizeParams.storage = storage
    sequelize = new Sequelize(sequelizeParams)
  }

  // Register every model on this sequelize instance.
  Article.initModel(sequelize)
  Comment.initModel(sequelize)
  SequelizeMeta.initModel(sequelize)
  Tag.initModel(sequelize)
  User.initModel(sequelize)
  UserFavoriteArticle.initModel(sequelize)
  UserFollowUser.initModel(sequelize)

  // Wire up all relationships between entities (see models/relationships.ts).
  associateModels(sequelize)

  return sequelize
}

// Do sequelize.sync, and then also populate SequelizeMeta with migrations
// that might not be needed if we've just done a full sync.
export async function sync(
  sequelize: Sequelize,
  opts: SyncOptions = {}
): Promise<boolean> {
  let dbExists = false
  try {
    await sequelize.models.SequelizeMeta.findOne()
    dbExists = true
  } catch (e) {
    if (e instanceof DatabaseError) {
      dbExists = false
    }
  }
  await sequelize.sync(opts)
  if (!dbExists || opts.force) {
    await sequelize.models.SequelizeMeta.bulkCreate(
      fs
        .readdirSync(path.join(path.dirname(__dirname), 'migrations'))
        .map((basename) => {
          return { name: basename }
        })
    )
  }
  return dbExists
}
