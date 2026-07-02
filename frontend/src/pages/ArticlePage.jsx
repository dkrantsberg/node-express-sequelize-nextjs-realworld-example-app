import marked from 'marked'
import React from 'react'
import { useParams } from 'react-router-dom'
import useSWR from 'swr'

import ArticleMeta from '@/components/ArticleMeta'
import Comment from '@/components/Comment'
import CommentInput from '@/components/CommentInput'
import { FavoriteArticleButtonContext } from '@/components/FavoriteArticleButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import { FollowUserButtonContext } from '@/components/FollowUserButton'
import fetcher from '@/api'
import { apiPath } from '@/config'
import { AppContext } from '@/context'
import { Article, Comment as CommentModel } from '@/models'

const ArticlePage = () => {
  const { pid } = useParams()

  // Article determines if the current user favorited the article or not.
  const { data: articleApi } = useSWR(
    `${apiPath}/articles/${pid}`,
    fetcher()
  )
  // We fetch comments so that the new posted comment will appear immediately after posted.
  const { data: commentApi } = useSWR(
    `${apiPath}/articles/${pid}/comments`,
    fetcher()
  )

  const article = articleApi ? new Article(articleApi.article) : undefined
  const comments = commentApi
    ? CommentModel.fromList(commentApi.comments)
    : undefined

  // TODO it is not ideal to have to setup state on every parent of FavoriteUserButton/FollowUserButton,
  // but I just don't know how to avoid it nicely, especially considering that the
  // button shows up on both profile and article pages, and thus comes from different
  // API data, so useSWR is not clean.
  const [following, setFollowing] = React.useState(false)
  React.useEffect(() => {
    setFollowing(article?.author.following)
  }, [article?.author.following])
  const [favorited, setFavorited] = React.useState(false)
  const [favoritesCount, setFavoritesCount] = React.useState(
    article?.favoritesCount
  )
  React.useEffect(() => {
    setFavorited(article?.favorited)
    setFavoritesCount(article?.favoritesCount)
  }, [article?.favorited, article?.favoritesCount])
  const { setTitle } = React.useContext(AppContext)
  React.useEffect(() => {
    setTitle(article?.title)
  }, [setTitle, article?.title])

  if (!article) {
    return <LoadingSpinner />
  }
  const markup = { __html: marked(article.body) }
  return (
    <>
      <div className="article-page">
        <div className="banner">
          <div className="container">
            <h1>{article.title}</h1>
            <FavoriteArticleButtonContext.Provider
              value={{
                favorited,
                setFavorited,
                favoritesCount,
                setFavoritesCount,
              }}
            >
              <FollowUserButtonContext.Provider
                value={{
                  following,
                  setFollowing,
                }}
              >
                <ArticleMeta article={article} />
              </FollowUserButtonContext.Provider>
            </FavoriteArticleButtonContext.Provider>
          </div>
        </div>
        <div className="container page">
          <div className="row article-content">
            <div className="col-md-12">
              <div dangerouslySetInnerHTML={markup} />
              <ul className="tag-list">
                {article.tagList?.map((tag) => (
                  <li className="tag-default tag-pill tag-outline" key={tag}>
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <hr />
          <div className="article-actions">
            <FavoriteArticleButtonContext.Provider
              value={{
                favorited,
                setFavorited,
                favoritesCount,
                setFavoritesCount,
              }}
            >
              <FollowUserButtonContext.Provider
                value={{
                  following,
                  setFollowing,
                }}
              >
                <ArticleMeta article={article} />
              </FollowUserButtonContext.Provider>
            </FavoriteArticleButtonContext.Provider>
          </div>
          <div className="row">
            <div className="col-xs-12 col-md-8 offset-md-2">
              <div>
                <CommentInput />
                {comments?.map((comment) => (
                  <Comment key={comment.id} comment={comment} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ArticlePage
