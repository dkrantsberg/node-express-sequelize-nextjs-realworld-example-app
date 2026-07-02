import slug from 'slug'
import {
  BelongsToGetAssociationMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  CreationOptional,
  DataTypes,
  HasManyGetAssociationsMixin,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Op,
  Sequelize,
  Transaction,
} from 'sequelize'

import type { Comment } from './comment'
import type { Tag } from './tag'
import type { User } from './user'

export class Article extends Model<
  InferAttributes<
    Article,
    { omit: 'author' | 'tags' | 'comments' | 'UserFavoriteArticles' }
  >,
  InferCreationAttributes<
    Article,
    { omit: 'author' | 'tags' | 'comments' | 'UserFavoriteArticles' }
  >
> {
  declare id: CreationOptional<number>
  declare slug: CreationOptional<string>
  declare title: string
  declare description: string
  declare body: string
  declare authorId: number
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  // Association data (populated by includes or set transiently). Omitted from attributes.
  declare author?: User
  declare tags?: Tag[]
  declare comments?: Comment[]
  declare UserFavoriteArticles?: Model[]

  // Association mixins.
  declare getAuthor: BelongsToGetAssociationMixin<User>
  declare getTags: BelongsToManyGetAssociationsMixin<Tag>
  declare setTags: BelongsToManySetAssociationsMixin<Tag, number>
  declare countFavoritedBy: BelongsToManyCountAssociationsMixin
  declare getComments: HasManyGetAssociationsMixin<Comment>

  // Delete tags that are only associated to this article, and which will therefore be
  // deleted after this article is deleted.
  async deleteEmptyTags(transaction?: Transaction) {
    // This should alwas be run inside a transaction, as it is an unsafe read modify write loop,
    // otherwise could fail if a new article is created in the middle: we could end up destroying
    // the tag of that article incorrectly. Converting to a single join delete statement
    // would do the trick, but that syntax is not possible in all DBs, and subqueries are impossible
    // without literals in Sequelize:
    // https://stackoverflow.com/questions/45354001/nodejs-sequelize-delete-with-nested-select-query
    const sequelize = (this.constructor as typeof Article)
      .sequelize as Sequelize

    // Get all tags that the article has that have exactly 1 article before we deleted
    // this article. We know we can delete those later on.
    const emptyTags = await sequelize.models.Article.findAll({
      // This raw aggregate query uses col()/fn() in places the static types model
      // narrowly; cast the options to keep the query intact.
      attributes: [
        sequelize.col('tags.id'),
        [sequelize.fn('COUNT', sequelize.col('Article.id')), 'count'],
      ],
      raw: true,
      includeIgnoreAttributes: false,
      include: [
        {
          model: sequelize.models.Tag,
          as: 'tags',
          where: { '$Article.id$': this.id },
          include: [
            {
              model: sequelize.models.Article,
              as: 'taggedArticles',
              required: false,
            },
          ],
        },
      ],
      group: ['tags.id'],
      order: [[sequelize.col('count'), 'DESC']],
      having: sequelize.where(
        sequelize.fn('COUNT', sequelize.col('Article.id')),
        Op.eq,
        1
      ),
      transaction,
    } as any)

    if (emptyTags.length) {
      await sequelize.models.Tag.destroy({
        where: {
          id: (emptyTags as unknown as Array<{ id: number }>).map(
            (tag) => tag.id
          ),
        },
        transaction,
      })
    }
  }

  // This method should always be used instead of the default destroy because it also destroys
  // tags that might now have no articles, and this need to be in a SERIALIZABLE transaction
  // with post + tag creation to prevent a race condition where the tag of a new post gets
  // wrongly deleted before it is assigned to the post.
  async destroy2() {
    const sequelize = (this.constructor as typeof Article)
      .sequelize as Sequelize
    await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        await this.destroy({ transaction: t })
      }
    )
  }

  async toJson(
    user?: User | false | null,
    opts: { tags?: Tag[]; favorited?: boolean } = {}
  ) {
    // We first check if those have already been fetched. This is ideally done
    // for example from JOINs on a query that fetches multiple articles like the
    // queries that show article lists on the home page.
    // https://github.com/cirosantilli/node-express-sequelize-nextjs-realworld-example-app/issues/5
    const authorPromise = this.author ? this.author : this.getAuthor()
    const tagPromise = opts.tags ? opts.tags : this.getTags()
    let favoritePromise: boolean | Promise<boolean>
    if (user) {
      favoritePromise =
        opts.favorited === undefined
          ? user.hasFavorite(this.id)
          : opts.favorited
    } else {
      favoritePromise = false
    }
    const [tags, favorited, favoritesCount, author] = await Promise.all([
      await tagPromise,
      await favoritePromise,
      this.countFavoritedBy(),
      (await authorPromise).toProfileJSONFor(user),
    ])
    return {
      slug: this.slug,
      title: this.title,
      description: this.description,
      body: this.body,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      tagList: tags.map((tag) => tag.name),
      favorited,
      favoritesCount,
      author,
    }
  }

  static initModel(sequelize: Sequelize): typeof Article {
    Article.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        slug: {
          type: DataTypes.STRING,
          unique: {
            name: 'article_slug',
            msg: 'Slug must be unique.',
          },
          set(this: Article, v: string) {
            this.setDataValue('slug', v.toLowerCase())
          },
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        body: {
          type: DataTypes.STRING(65536),
          allowNull: false,
        },
        authorId: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: 'Article',
        hooks: {
          beforeValidate: (article: Article) => {
            if (!article.slug) {
              article.slug =
                slug(article.title) +
                '-' +
                ((Math.random() * Math.pow(36, 6)) | 0).toString(36)
            }
          },
          beforeDestroy: async (article: Article, options) => {
            await article.deleteEmptyTags(options.transaction ?? undefined)
          },
        },
        indexes: [{ fields: ['createdAt'] }],
      }
    )
    return Article
  }
}
