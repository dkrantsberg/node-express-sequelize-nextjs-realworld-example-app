import React from 'react'
import { useParams } from 'react-router-dom'
import useSWR from 'swr'

import ArticlePreview from '@/components/ArticlePreview'
import { apiPath, articleLimit } from '@/config'
import ErrorMessage from '@/components/ErrorMessage'
import { FavoriteArticleButtonContext } from '@/components/FavoriteArticleButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import Maybe from '@/components/Maybe'
import Pagination from '@/components/Pagination'
import fetcher from '@/api'
import { Article } from '@/models'

const ArticleList = ({ loggedInUser, page, setPage, what, tag = undefined }) => {
  const { pid } = useParams()
  const fetchURL = (() => {
    if (loggedInUser === undefined) {
      // We haven't decided yet because we haven't decided if we are logged in or out yet.
      return null
    }
    switch (what) {
      case 'favorites':
        return `${apiPath}/articles?limit=${articleLimit}&favorited=${encodeURIComponent(
          String(pid)
        )}&offset=${page * articleLimit}`
      case 'my-posts':
        return `${apiPath}/articles?limit=${articleLimit}&author=${encodeURIComponent(
          String(pid)
        )}&offset=${page * articleLimit}`
      case 'tag':
        return `${apiPath}/articles?limit=${articleLimit}&tag=${encodeURIComponent(
          tag
        )}&offset=${page * articleLimit}`
      case 'feed':
        return `${apiPath}/articles/feed?limit=${articleLimit}&offset=${
          page * articleLimit
        }`
      case 'global':
        return `${apiPath}/articles?limit=${articleLimit}&offset=${
          page * articleLimit
        }`
      case undefined:
        // We haven't decided yet because we haven't decided if we are logged in or out yet.
        return null
      default:
        throw new Error(`Unknown search: ${what}`)
    }
  })()
  const { data, error } = useSWR(fetchURL, fetcher())
  let articles = []
  let articlesCount = 0
  if (data) {
    articles = Article.fromList(data.articles)
    articlesCount = data.articlesCount
  }

  // Favorite article button state.
  const favorited = []
  const setFavorited = []
  const favoritesCount = []
  const setFavoritesCount = []
  // MUST be articleLimit and not articles.length, because articles.length
  // can happen a variable number of times on index page due to:
  // * load page logged off on global
  // * login, which leads to feed instead of global
  // and calling hooks like useState different number of times is a capital sin
  // in React and makes everything blow up.
  for (let i = 0; i < articleLimit; i++) {
    // https://stackoverflow.com/questions/53906843/why-cant-react-hooks-be-called-inside-loops-or-nested-function
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ;[favorited[i], setFavorited[i]] = React.useState(false)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ;[favoritesCount[i], setFavoritesCount[i]] = React.useState(0)
  }
  React.useEffect(
    () => {
      const nArticles = articles?.length || 0
      for (let i = 0; i < nArticles; i++) {
        setFavorited[i](articles[i].favorited)
        setFavoritesCount[i](articles[i].favoritesCount)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    Object.assign(
      articles
        .map((a) => a.favorited)
        .concat(articles.map((a) => a.favoritesCount)),
      { length: articleLimit }
    )
  )

  if (error) return <ErrorMessage message="Cannot load recent articles..." />
  if (!data) return <LoadingSpinner />
  if (articles?.length === 0) {
    return <div className="article-preview">No articles are here... yet.</div>
  }
  return (
    <>
      {articles?.map((article, i) => (
        <FavoriteArticleButtonContext.Provider
          key={article.slug}
          value={{
            favorited: favorited[i],
            setFavorited: setFavorited[i],
            favoritesCount: favoritesCount[i],
            setFavoritesCount: setFavoritesCount[i],
          }}
        >
          <ArticlePreview key={article.slug} article={article} />
        </FavoriteArticleButtonContext.Provider>
      ))}
      <Maybe test={articlesCount && articlesCount > articleLimit}>
        <Pagination
          articlesCount={articlesCount}
          articlesPerPage={articleLimit}
          showPagesMax={10}
          currentPage={page}
          setCurrentPage={setPage}
        />
      </Maybe>
    </>
  )
}

export default ArticleList
