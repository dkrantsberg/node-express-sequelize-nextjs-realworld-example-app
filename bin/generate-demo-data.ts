#!/usr/bin/env -S npx tsx

import assert from 'assert'
import path from 'path'

import { Command, InvalidArgumentError } from 'commander'

import config from '../front/config'
import { generateDemoData } from '../test_lib'

function myParseInt(value: string): number {
  const parsedValue = parseInt(value)
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.')
  }
  return parsedValue
}

const program = new Command()
program.option(
  '-a, --n-articles-per-user <n>',
  'n articles per user',
  myParseInt,
  50
)
program.option(
  '-c, --n-max-comments-per-article <n>',
  'maximum number of comments per article',
  myParseInt,
  3
)
program.option(
  '--empty',
  'ignore everything else and make an empty database instead',
  false
)
program.option(
  '-f, --n-follows-per-user <n>',
  'n follows per user',
  myParseInt,
  2
)
program.option('-t, --n-tags <n>', 'n favorites per user', myParseInt, 5)
program.option(
  '-T, --n-max-tags-per-article <n>',
  'maximum number of tags per article',
  myParseInt,
  3
)
program.option(
  '--force-production',
  'allow running in production, DELETES ALL DATA',
  false
)
program.option('-u, --n-users <n>', 'n users', myParseInt, 10)
program.option(
  '-v, --n-favorites-per-user <n>',
  'n favorites per user',
  myParseInt,
  5
)
program.parse(process.argv)
const options = program.opts()

if (!options.forceProduction) {
  assert(!config.isProduction)
}
;(async () => {
  const sequelize = await generateDemoData({
    directory: path.dirname(__dirname),
    empty: options.empty,
    nArticlesPerUser: options.nArticlesPerUser,
    nMaxCommentsPerArticle: options.nMaxCommentsPerArticle,
    nMaxTagsPerArticle: options.nMaxTagsPerArticle,
    nFavoritesPerUser: options.nFavoritesPerUser,
    nFollowsPerUser: options.nFollowsPerUser,
    nTags: options.nTags,
    nUsers: options.nUsers,
    verbose: true,
  })
  await sequelize.close()
})()
