import { Request } from 'express'
import { Model, ModelStatic, Sequelize } from 'sequelize'

import config from './config'
import type { Tag } from './models/tag'

export async function deleteOldestForDemo(Model: ModelStatic<Model>) {
  if (config.isDemo) {
    // Delete the oldest comments to keep data size limited.
    const old = await Model.findAll({
      order: [['createdAt', 'DESC']],
      offset: config.demoMaxObjs,
      limit: config.maxObjsInMemory,
      attributes: ['id'],
    })
    if (old.length) {
      await Model.destroy({
        where: { id: old.map((row) => row.get('id') as number) },
      })
    }
  }
}

// https://stackoverflow.com/questions/14382725/how-to-get-the-correct-ip-address-of-a-client-into-a-node-socket-io-app-hosted-o/14382990#14382990
// Works on Heroku 2021.
export function getClientIp(req: Request): string | undefined {
  return req.header('x-forwarded-for')
}

export class ValidationError extends Error {
  errors: Record<string, string[]>
  status: number
  constructor(errors: Record<string, string[]>, status: number) {
    super()
    this.errors = errors
    this.status = status
  }
}

export async function getIndexTags(sequelize: Sequelize): Promise<string[]> {
  const TagModel = sequelize.models.Tag as ModelStatic<Tag>
  return (
    await TagModel.findAll({
      order: [
        ['createdAt', 'DESC'],
        ['name', 'ASC'],
      ],
    })
  ).map((tag) => tag.name)
}

export function validatePositiveInteger(s: string): [number, boolean] {
  const i = Number(s)
  const ok = s !== '' && Number.isInteger(i) && i >= 0
  return [i, ok]
}

export function validateParam<T>(
  obj: Record<string, unknown>,
  prop: string,
  validator: (s: string) => [T, boolean],
  defaultValue: T
): T {
  const param = obj[prop]
  if (typeof param === 'undefined') {
    return defaultValue
  } else {
    const [val, ok] = validator(param as string)
    if (ok) {
      return val
    } else {
      throw new ValidationError(
        {
          [prop]: [
            `validator ${validator.name} failed on ${prop} = "${param}"`,
          ],
        },
        422
      )
    }
  }
}

export default {
  deleteOldestForDemo,
  getClientIp,
  ValidationError,
  getIndexTags,
  validatePositiveInteger,
  validateParam,
}
