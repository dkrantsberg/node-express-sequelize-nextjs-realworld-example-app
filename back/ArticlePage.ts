import { GetStaticProps, GetStaticPaths } from 'next'
import { ModelStatic } from 'sequelize'

import { ArticlePageProps } from 'front/ArticlePage'
import { fallback, revalidate, prerenderAll } from 'front/config'
import sequelize from 'db'
import type { Article } from 'models/article'

export const getStaticPathsArticle: GetStaticPaths = async () => {
  let paths
  if (prerenderAll) {
    const ArticleModel = sequelize.models.Article as ModelStatic<Article>
    paths = (await ArticleModel.findAll()).map((article) => {
      return {
        params: {
          pid: article.slug,
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

export function getStaticPropsArticle(
  addRevalidate?,
  addComments?
): GetStaticProps {
  return async ({ params: { pid } }) => {
    const ArticleModel = sequelize.models.Article as ModelStatic<Article>
    const article = await ArticleModel.findOne({
      where: { slug: pid },
      include: [{ model: sequelize.models.User, as: 'author' }],
    })
    if (!article) {
      return {
        notFound: true,
      }
    }
    let comments
    if (addComments) {
      comments = await article.getComments({
        order: [['createdAt', 'DESC']],
        include: [{ model: sequelize.models.User, as: 'author' }],
      })
    }
    // toJson() serializes dates to ISO strings, whereas ArticleType/CommentType
    // model them as numbers; cast at this boundary rather than churn the frontend types.
    const props: ArticlePageProps = {
      article: (await article.toJson()) as any,
    }
    if (addComments) {
      props.comments = (await Promise.all(
        comments.map((comment) => comment.toJson())
      )) as any
    }
    const ret: Awaited<ReturnType<GetStaticProps>> = {
      props,
    }
    // We can only add this for getStaticProps, not getServerSideProps.
    if (addRevalidate) {
      ret.revalidate = revalidate
    }
    return ret
  }
}
