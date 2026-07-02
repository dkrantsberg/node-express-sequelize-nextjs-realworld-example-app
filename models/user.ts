import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyRemoveAssociationMixin,
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  ModelStatic,
  Sequelize,
  fn,
  col,
  Op,
} from 'sequelize'

import config from '../front/config'
import type { Article } from './article'

export class User extends Model<
  InferAttributes<User, { omit: 'token' }>,
  InferCreationAttributes<User, { omit: 'token' }>
> {
  declare id: CreationOptional<number>
  declare username: string
  declare email: string
  declare bio: CreationOptional<string | null>
  declare image: CreationOptional<string | null>
  declare hash: CreationOptional<string>
  declare salt: CreationOptional<string>
  declare ip: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  // Not a DB column: set transiently on the login route. Omitted from attributes.
  token?: string

  // Association mixins (declared, never assigned — Sequelize provides them at runtime).
  declare hasFollow: BelongsToManyHasAssociationMixin<User, number>
  declare addFollow: BelongsToManyAddAssociationMixin<User, number>
  declare removeFollow: BelongsToManyRemoveAssociationMixin<User, number>
  declare hasFavorite: BelongsToManyHasAssociationMixin<Article, number>
  declare addFavorite: BelongsToManyAddAssociationMixin<Article, number>
  declare removeFavorite: BelongsToManyRemoveAssociationMixin<Article, number>

  generateJWT(): string {
    const today = new Date()
    const exp = new Date(today)
    exp.setDate(today.getDate() + 60)
    return jwt.sign(
      {
        id: this.id,
        username: this.username,
        exp: Math.floor(exp.getTime() / 1000),
      },
      config.secret,
      { algorithm: 'HS256' }
    )
  }

  toAuthJSON() {
    return {
      username: this.username,
      email: this.email,
      token: this.generateJWT(),
      bio: this.bio == null ? '' : this.bio,
      image: this.image == null ? '' : this.image,
    }
  }

  async toProfileJSONFor(user?: User | false | null) {
    return {
      username: this.username,
      bio: this.bio == null ? '' : this.bio,
      // This one returns the default image if empty, unlike toAuthJSON which returns nothing.
      // Therefore, this one is what you want when viewing profiles, and toAuthJSON is what
      // you want when loading profile settings forms for which we want an empty field.
      image:
        this.image ||
        'https://static.productionready.io/images/smiley-cyrus.jpg',
      following: user ? await user.hasFollow(this.id) : false,
    }
  }

  async findAndCountArticlesByFollowed(offset: number, limit: number) {
    const sequelize = (this.constructor as typeof User).sequelize as Sequelize
    const ArticleModel = sequelize.models.Article as ModelStatic<Article>
    return ArticleModel.findAndCountAll({
      offset,
      limit,
      subQuery: false,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'author',
          required: true,
          include: [
            {
              model: sequelize.models.UserFollowUser,
              on: {
                followId: { [Op.col]: 'author.id' },
              },
              attributes: [],
              where: { userId: this.id },
            },
          ],
        },
      ],
    })
  }

  async findAndCountArticlesByFollowedToJson(offset: number, limit: number) {
    const { count: articlesCount, rows: articles } =
      await this.findAndCountArticlesByFollowed(offset, limit)
    const articlesJson = await Promise.all(
      articles.map((article) => article.toJson(this))
    )
    return {
      articles: articlesJson,
      articlesCount,
    }
  }

  async getArticleCountByFollowed(): Promise<number> {
    const row: any = await User.findByPk(this.id, {
      subQuery: false,
      attributes: [[fn('COUNT', col('follows.authoredArticles.id')), 'count']],
      include: [
        {
          model: User,
          as: 'follows',
          attributes: [],
          through: { attributes: [] },
          include: [
            {
              model: (this.constructor as typeof User).sequelize!.models
                .Article,
              as: 'authoredArticles',
              attributes: [],
            },
          ],
        },
      ],
    } as any)
    return row.dataValues.count
  }

  static validPassword(user: { salt: string; hash: string }, password: string) {
    const hash = crypto
      .pbkdf2Sync(password, user.salt, 10000, 512, 'sha512')
      .toString('hex')
    return user.hash === hash
  }

  static setPassword(user: { salt?: string; hash?: string }, password: string) {
    user.salt = crypto.randomBytes(16).toString('hex')
    user.hash = crypto
      .pbkdf2Sync(password, user.salt, 10000, 512, 'sha512')
      .toString('hex')
  }

  static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        username: {
          type: DataTypes.STRING,
          set(this: User, v: string) {
            this.setDataValue('username', v.toLowerCase())
          },
          unique: {
            name: 'user_username',
            msg: 'This username is taken.',
          },
          validate: {
            min: {
              args: [3],
              msg: 'Username must start with a letter, have no spaces, and be at least 3 characters.',
            },
            max: {
              args: [40],
              msg: 'Username must start with a letter, have no spaces, and be at less than 40 characters.',
            },
            is: {
              // must start with letter and only have letters, numbers, dashes
              args: /^[A-Za-z][A-Za-z0-9-_]+$/i,
              msg: 'Username must start with a letter, have no spaces, and be 3 - 40 characters.',
            },
          },
        },
        email: {
          type: DataTypes.STRING,
          set(this: User, v: string) {
            this.setDataValue('email', v.toLowerCase())
          },
          unique: {
            name: 'user_email',
            msg: 'This email is taken.',
          },
          validate: {
            isEmail: {
              msg: 'This email does not seem valid.',
            },
            max: {
              args: [254],
              msg: 'This email is too long, the maximum size is 254 characters.',
            },
          },
        },
        bio: DataTypes.STRING,
        image: DataTypes.STRING,
        hash: DataTypes.STRING(1024),
        salt: DataTypes.STRING,
        ip: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: 'User',
        indexes: [{ fields: ['username'] }, { fields: ['email'] }],
      }
    )
    return User
  }
}
