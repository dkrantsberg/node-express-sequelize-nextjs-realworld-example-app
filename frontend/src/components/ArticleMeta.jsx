import React from 'react'

import ArticleActions from '@/components/ArticleActions'
import CustomImage from '@/components/CustomImage'
import CustomLink from '@/components/CustomLink'
import routes from '@/routes'

const ArticleMeta = ({ article }) => {
  if (!article) return null
  return (
    <div className="article-meta">
      <CustomLink
        href={routes.userView(encodeURIComponent(article.author?.username))}
      >
        <CustomImage src={article.author?.image} alt="author profile image" />
      </CustomLink>
      <div className="info">
        <CustomLink
          href={routes.userView(encodeURIComponent(article.author?.username))}
          className="author"
        >
          {article.author?.username}
        </CustomLink>
        <span className="date">{article.formattedDate}</span>
      </div>
      <ArticleActions article={article} />
    </div>
  )
}

export default ArticleMeta
