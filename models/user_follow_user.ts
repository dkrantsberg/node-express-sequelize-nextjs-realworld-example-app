import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize'

// Join table for the self-referential "user follows user" many-to-many.
export class UserFollowUser extends Model<
  InferAttributes<UserFollowUser>,
  InferCreationAttributes<UserFollowUser>
> {
  declare id: CreationOptional<number>
  declare userId: number
  declare followId: number
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static initModel(sequelize: Sequelize): typeof UserFollowUser {
    UserFollowUser.init(
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
        followId: {
          type: DataTypes.INTEGER,
          references: { model: 'User', key: 'id' },
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: 'UserFollowUser',
        tableName: 'UserFollowUser',
      }
    )
    return UserFollowUser
  }

  static associate(sequelize: Sequelize) {
    UserFollowUser.belongsTo(sequelize.models.User, { foreignKey: 'userId' })
  }
}
