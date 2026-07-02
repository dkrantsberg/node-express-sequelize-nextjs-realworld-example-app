#!/usr/bin/env -S npx tsx

// Sync the database. If the database exists, migrate.
// Otherwise, just create directly from the latest DB settings to speed things up.
//
// Originally added for next build since we don't know how to run hooks.
// before next build, and the database wouldn't exist otherwise.

import child_process from 'child_process'
import path from 'path'

import { DatabaseError } from 'sequelize'

import config from '../config'
import { getSequelize, sync } from '../models'
;(async () => {
  const sequelize = getSequelize(path.dirname(__dirname))
  let dbEmpty = true
  try {
    await sequelize.models.SequelizeMeta.findOne()
    dbEmpty = false
  } catch (e) {
    if (e instanceof DatabaseError) {
      await sync(sequelize)
    }
  }
  if (!dbEmpty) {
    const env = process.env
    if (config.postgres) {
      ;(env as Record<string, string>).NODE_ENV = 'production'
    }
    const out = child_process.spawnSync(
      'npx',
      ['sequelize-cli', 'db:migrate'],
      {
        env,
      }
    )
    console.error(out.stdout.toString())
    console.error(out.stderr.toString())
    process.exit(out.status ?? 0)
  }
})()
