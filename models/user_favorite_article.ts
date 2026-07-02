import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize'

// Join table for the "user favorites article" many-to-many.
export class UserFavoriteArticle extends Model<
  InferAttributes<UserFavoriteArticle>,
  InferCreationAttributes<UserFavoriteArticle>
> {
  declare id: CreationOptional<number>
  declare userId: number
  declare articleId: number
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof UserFavoriteArticle {
    UserFavoriteArticle.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          references: { model: 'User', key: 'id' },
        },
        articleId: {
          type: DataTypes.INTEGER,
          references: { model: 'Article', key: 'id' },
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: 'UserFavoriteArticle',
      }
    )
    return UserFavoriteArticle
  }
}
