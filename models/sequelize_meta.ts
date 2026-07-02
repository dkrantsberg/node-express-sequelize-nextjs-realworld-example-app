import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize'

export class SequelizeMeta extends Model<
  InferAttributes<SequelizeMeta>,
  InferCreationAttributes<SequelizeMeta>
> {
  declare name: string

  static initModel(sequelize: Sequelize): typeof SequelizeMeta {
    SequelizeMeta.init(
      {
        name: {
          type: DataTypes.STRING,
          primaryKey: true,
          unique: true,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'SequelizeMeta',
        timestamps: false,
      }
    )
    return SequelizeMeta
  }
}
