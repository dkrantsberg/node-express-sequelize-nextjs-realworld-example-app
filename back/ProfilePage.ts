import { GetStaticProps, GetStaticPaths } from 'next'
import { ModelStatic } from 'sequelize'

import { articleLimit, fallback, revalidate, prerenderAll } from 'front/config'
import sequelize from 'db'
import type { Article } from 'models/article'
import type { User } from 'models/user'

export const getStaticPathsProfile: GetStaticPaths = async () => {
  let paths
  if (prerenderAll) {
    const UserModel = sequelize.models.User as ModelStatic<User>
    paths = (
      await UserModel.findAll({
        order: [['username', 'ASC']],
      })
    ).map((user) => {
      return {
        params: {
          pid: user.username,
        },
      }
    })
  } else {
    paths = []
  }
  return {
    fallback,
    paths,
  }
}

export function getStaticPropsProfile(tab): GetStaticProps {
  return async ({ params: { pid } }) => {
    const include = []
    if (tab === 'my-posts') {
      include.push({
        model: sequelize.models.User,
        as: 'author',
        where: { username: pid },
      })
    } else if (tab === 'favorites') {
      include.push({
        model: sequelize.models.User,
        as: 'favoritedBy',
        where: { username: pid },
      })
    }
    const ArticleModel = sequelize.models.Article as ModelStatic<Article>
    const UserModel = sequelize.models.User as ModelStatic<User>
    const [articles, user] = await Promise.all([
      ArticleModel.findAndCountAll({
        order: [['createdAt', 'DESC']],
        limit: articleLimit,
        include,
      }),
      UserModel.findOne({
        where: { username: pid },
      }),
    ])
    if (!user) {
      return {
        notFound: true,
      }
    }
    return {
      revalidate,
      props: {
        profile: await user.toProfileJSONFor(),
        articles: await Promise.all(
          articles.rows.map((article) => article.toJson())
        ),
        articlesCount: articles.count,
      },
    }
  }
}
