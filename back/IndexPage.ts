import { GetStaticProps } from 'next'
import { ModelStatic } from 'sequelize'
import { MyGetServerSideProps } from 'front/types'
import { JwtPayload, verify } from 'jsonwebtoken'

import { getCookieFromReq, AUTH_COOKIE_NAME } from 'front'
import { articleLimit, revalidate, secret } from 'front/config'
import sequelize from 'db'
import { getIndexTags } from 'lib'
import type { Article } from 'models/article'
import type { User } from 'models/user'

async function getLoggedOutProps() {
  const ArticleModel = sequelize.models.Article as ModelStatic<Article>
  const articles = await ArticleModel.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit: articleLimit,
  })
  return {
    articles: await Promise.all(
      articles.rows.map((article) => article.toJson())
    ),
    articlesCount: articles.count,
    tags: await getIndexTags(sequelize),
  }
}

export async function getLoggedInUser(req, res): Promise<User | null> {
  const authCookie = getCookieFromReq(req, AUTH_COOKIE_NAME)
  let verifiedUser: JwtPayload | string
  if (authCookie) {
    try {
      verifiedUser = verify(authCookie, secret, { algorithms: ['HS256'] })
    } catch (e) {
      return null
    }
  } else {
    return null
  }
  const UserModel = sequelize.models.User as ModelStatic<User>
  const user = await UserModel.findByPk((verifiedUser as JwtPayload).id)
  if (user === null) {
    res.clearCookie(AUTH_COOKIE_NAME)
  }
  return user
}

export const getServerSidePropsHoc: MyGetServerSideProps = async ({
  req,
  res,
}) => {
  const loggedInUser = await getLoggedInUser(req, res)
  let props
  if (loggedInUser) {
    const [articles, tags] = await Promise.all([
      loggedInUser.findAndCountArticlesByFollowedToJson(0, articleLimit),
      getIndexTags(req.sequelize),
    ])
    props = Object.assign(articles, { tags })
  } else {
    props = await getLoggedOutProps()
  }
  // Not required by Next, just to factor things out in our demo which has both ISR and SSR.
  props.ssr = true
  return { props }
}

export const getStaticPropsHoc: GetStaticProps = async () => {
  return {
    props: await getLoggedOutProps(),
    revalidate,
  }
}
