import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Route, Routes, useLocation } from 'react-router-dom'
import { SWRConfig } from 'swr'

import CustomLink from '@/components/CustomLink'
import Navbar from '@/components/Navbar'
import { appName, googleAnalyticsId, isDemo, isProduction } from '@/config'
import { AppContext, AppContextProvider } from '@/context'
import routes from '@/routes'

import IndexPage from '@/pages/IndexPage'
import ArticlePage from '@/pages/ArticlePage'
import ArticleEditorHoc from '@/pages/ArticleEditor'
import LoginPageHoc from '@/pages/LoginPage'
import ProfileHoc from '@/pages/ProfilePage'
import SettingsPage from '@/pages/SettingsPage'

const NewArticleEditor = ArticleEditorHoc(true)
const EditArticleEditor = ArticleEditorHoc()
const LoginPage = LoginPageHoc({})
const RegisterPage = LoginPageHoc({ register: true })
const ProfileMyPosts = ProfileHoc('my-posts')
const ProfileFavorites = ProfileHoc('favorites')

function MyHead() {
  const { title } = React.useContext(AppContext)
  const realTitle = title === undefined ? '' : title + ' - '
  return (
    <Helmet>
      <title>{realTitle + appName}</title>
    </Helmet>
  )
}

// Google Analytics page-view tracking on route change.
function useAnalytics() {
  const location = useLocation()
  React.useEffect(() => {
    if (isProduction && typeof window.gtag === 'function') {
      window.gtag('config', googleAnalyticsId, {
        page_path: location.pathname,
      })
    }
  }, [location.pathname])
}

const App = () => {
  useAnalytics()
  return (
    <AppContextProvider>
      <SWRConfig
        value={{
          // Do everything to prevent SWR from refreshing pages automatically.
          // When users want to check for new data, they can press F5, otherwise
          // we might overwrite what they were currently looking at.
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          shouldRetryOnError: false,
        }}
      >
        <MyHead />
        <Navbar />
        {isDemo && (
          <div className="container" style={{ marginBottom: '20px' }}>
            Source code for this website:{' '}
            <a href="https://github.com/cirosantilli/node-express-sequelize-nextjs-realworld-example-app">
              https://github.com/cirosantilli/node-express-sequelize-nextjs-realworld-example-app
            </a>
          </div>
        )}
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/article/:pid" element={<ArticlePage />} />
          <Route path="/editor" element={<NewArticleEditor />} />
          <Route path="/editor/:pid" element={<EditArticleEditor />} />
          <Route path="/user/login" element={<LoginPage />} />
          <Route path="/user/register" element={<RegisterPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile/:pid" element={<ProfileMyPosts />} />
          <Route
            path="/profile/:pid/favorites"
            element={<ProfileFavorites />}
          />
        </Routes>
        <footer>
          <div className="container">
            <CustomLink href={routes.home()} className="logo-font">
              {appName.toLowerCase()}
            </CustomLink>
            <span className="attribution">
              {' '}
              © 2021. An interactive learning project from{' '}
              <a href="https://thinkster.io">Thinkster</a>. Code licensed under
              MIT.
            </span>
          </div>
        </footer>
      </SWRConfig>
    </AppContextProvider>
  )
}

export default App
