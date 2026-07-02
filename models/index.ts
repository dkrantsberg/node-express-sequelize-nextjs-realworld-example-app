import fs from 'fs'
import path from 'path'

import {
  DatabaseError,
  DataTypes,
  Options,
  Sequelize,
  SyncOptions,
} from 'sequelize'

import config from '../front/config'
import { Article } from './article'
import { Comment } from './comment'
import { SequelizeMeta } from './sequelize_meta'
import { Tag } from './tag'
import { User } from './user'

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

  Article.initModel(sequelize)
  Comment.initModel(sequelize)
  SequelizeMeta.initModel(sequelize)
  Tag.initModel(sequelize)
  User.initModel(sequelize)

  // Associations.

  // User follow user (super many to many)
  const UserFollowUser = sequelize.define(
    'UserFollowUser',
    {
      userId: {
        type: DataTypes.INTEGER,
        references: {
          model: User,
          key: 'id',
        },
      },
      followId: {
        type: DataTypes.INTEGER,
        references: {
          model: User,
          key: 'id',
        },
      },
    },
    {
      tableName: 'UserFollowUser',
    }
  )
  User.belongsToMany(User, {
    through: UserFollowUser,
    as: 'follows',
    foreignKey: 'userId',
    otherKey: 'followId',
  })
  User.belongsToMany(User, {
    through: UserFollowUser,
    as: 'followed',
    foreignKey: 'followId',
    otherKey: 'userId',
  })
  UserFollowUser.belongsTo(User, { foreignKey: 'userId' })
  User.hasMany(UserFollowUser, { foreignKey: 'followId' })

  // User favorite Article (super many to many)
  const UserFavoriteArticle = sequelize.define('UserFavoriteArticle', {
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: 'id',
      },
    },
    articleId: {
      type: DataTypes.INTEGER,
      references: {
        model: Article,
        key: 'id',
      },
    },
  })
  Article.belongsToMany(User, {
    through: UserFavoriteArticle,
    as: 'favoritedBy',
    foreignKey: 'articleId',
    otherKey: 'userId',
  })
  User.belongsToMany(Article, {
    through: UserFavoriteArticle,
    as: 'favorites',
    foreignKey: 'userId',
    otherKey: 'articleId',
  })
  Article.hasMany(UserFavoriteArticle, { foreignKey: 'articleId' })
  UserFavoriteArticle.belongsTo(Article, { foreignKey: 'articleId' })
  User.hasMany(UserFavoriteArticle, { foreignKey: 'userId' })
  UserFavoriteArticle.belongsTo(User, { foreignKey: 'userId' })

  // User authors Article
  User.hasMany(Article, {
    as: 'authoredArticles',
    foreignKey: 'authorId',
    onDelete: 'CASCADE',
    hooks: true,
  })
  Article.belongsTo(User, {
    as: 'author',
    hooks: true,
    foreignKey: {
      name: 'authorId',
      allowNull: false,
    },
  })

  // Article has Comment
  Article.hasMany(Comment, {
    foreignKey: 'articleId',
    onDelete: 'CASCADE',
  })
  Comment.belongsTo(Article, {
    foreignKey: {
      name: 'articleId',
      allowNull: false,
    },
  })

  // User authors Comment
  User.hasMany(Comment, {
    foreignKey: 'authorId',
    onDelete: 'CASCADE',
  })
  Comment.belongsTo(User, {
    as: 'author',
    foreignKey: {
      name: 'authorId',
      allowNull: false,
    },
  })

  // Tag Article
  Article.belongsToMany(Tag, {
    through: 'ArticleTag',
    as: 'tags',
    foreignKey: 'articleId',
    otherKey: 'tagId',
  })
  Tag.belongsToMany(Article, {
    through: 'ArticleTag',
    as: 'taggedArticles',
    foreignKey: 'tagId',
    otherKey: 'articleId',
  })

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
