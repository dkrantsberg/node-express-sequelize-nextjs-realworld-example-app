import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize'

export class Tag extends Model<
  InferAttributes<Tag>,
  InferCreationAttributes<Tag>
> {
  declare id: CreationOptional<number>
  declare name: string
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static associate(sequelize: Sequelize) {
    // Tag is applied to many articles (many-to-many via the ArticleTag join table).
    Tag.belongsToMany(sequelize.models.Article, {
      through: 'ArticleTag',
      as: 'taggedArticles',
      foreignKey: 'tagId',
      otherKey: 'articleId',
    })
  }

  static initModel(sequelize: Sequelize): typeof Tag {
    Tag.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          unique: {
            name: 'tag_name',
            msg: 'Tag name must be unique.',
          },
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: 'Tag',
        indexes: [{ fields: ['createdAt'] }],
      }
    )
    return Tag
  }
}
