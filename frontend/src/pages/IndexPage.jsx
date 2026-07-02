import React from 'react'
import { Helmet } from 'react-helmet-async'

import ArticleList from '@/components/ArticleList'
import Maybe from '@/components/Maybe'
import Tags from '@/components/Tags'
import { appName } from '@/config'
import useLoggedInUser from '@/useLoggedInUser'
import { AppContext, resetIndexState } from '@/context'

const IndexPage = () => {
  const { page, setPage, tab, setTab, tag, setTag } =
    React.useContext(AppContext)
  const loggedInUser = useLoggedInUser()
  React.useEffect(() => {
    resetIndexState(setPage, setTab, loggedInUser)
  }, [loggedInUser, setPage, setTab])
  return (
    <>
      <Helmet>
        <meta
          name="description"
          content="React + SWR codebase containing realworld examples (CRUD, auth, advanced patterns, etc) that adheres to the realworld spec and API"
        />
      </Helmet>
      <div className="home-page">
        <Maybe test={!loggedInUser}>
          <div className="banner">
            <div className="container">
              <h1 className="logo-font">{appName.toLowerCase()}</h1>
              <p>A place to share your knowledge.</p>
            </div>
          </div>
        </Maybe>
        <div className="container page">
          <div className="row">
            <div className="col-md-9">
              <div className="feed-toggle">
                <ul className="nav nav-pills outline-active">
                  <Maybe test={loggedInUser}>
                    <li className="nav-item">
                      <a
                        className={`link nav-link${
                          tab === 'feed' ? ' active' : ''
                        }`}
                        onClick={() => {
                          setPage(0)
                          setTab('feed')
                        }}
                      >
                        Your Feed
                      </a>
                    </li>
                  </Maybe>
                  <li className="nav-item">
                    <a
                      className={`link nav-link${
                        tab === 'global' ? ' active' : ''
                      }`}
                      onClick={() => {
                        setPage(0)
                        setTab('global')
                      }}
                    >
                      Global Feed
                    </a>
                  </li>
                  <Maybe test={tab === 'tag'}>
                    <li className="nav-item">
                      <a className="link nav-link active">
                        <i className="ion-pound" /> {tag}
                      </a>
                    </li>
                  </Maybe>
                </ul>
              </div>
              <ArticleList
                {...{
                  loggedInUser,
                  page,
                  setPage,
                  what: tab,
                  tag,
                }}
              />
            </div>
            <div className="col-md-3">
              <div className="sidebar">
                <p>Popular Tags</p>
                <Tags {...{ setTab, setTag, setPage }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default IndexPage
