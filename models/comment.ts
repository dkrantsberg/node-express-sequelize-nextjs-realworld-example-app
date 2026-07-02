import {
  BelongsToGetAssociationMixin,
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize'

import type { User } from './user'

export class Comment extends Model<
  InferAttributes<Comment, { omit: 'author' }>,
  InferCreationAttributes<Comment, { omit: 'author' }>
> {
  declare id: CreationOptional<number>
  declare body: CreationOptional<string | null>
  declare articleId: number
  declare authorId: number
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  // Association data (populated by include or set transiently). Omitted from attributes.
  declare author?: User

  declare getAuthor: BelongsToGetAssociationMixin<User>

  async toJson(user?: User | false | null) {
    return {
      id: this.id,
      body: this.body,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      author: await (this.author as User).toProfileJSONFor(user),
    }
  }

  static initModel(sequelize: Sequelize): typeof Comment {
    Comment.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        body: DataTypes.STRING,
        articleId: DataTypes.INTEGER,
        authorId: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: 'Comment',
      }
    )
    return Comment
  }
}
