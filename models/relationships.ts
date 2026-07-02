import { Sequelize } from 'sequelize'

// All associations between entities live here, in one place. Called by
// getSequelize() after every model has been initialized on the instance.
export function associateModels(sequelize: Sequelize) {
  const { Article, Comment, Tag, User, UserFavoriteArticle, UserFollowUser } =
    sequelize.models

  // User follows user (self-referential super many-to-many).
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

  // User favorites articles (super many-to-many).
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

  // User authors articles.
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

  // Article has comments.
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

  // User authors comments.
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

  // Articles are tagged with tags (many-to-many via the ArticleTag join table).
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
}
