import React from 'react'
import { Helmet } from 'react-helmet-async'

import CustomLink from '@/components/CustomLink'
import LoginForm from '@/components/LoginForm'
import { AppContext } from '@/context'
import routes from '@/routes'

const LoginPageHoc = ({ register = false }) => {
  const title = register ? 'Sign up' : 'Sign in'
  return function LoginPage() {
    const { setTitle } = React.useContext(AppContext)
    React.useEffect(() => {
      setTitle(title)
    }, [setTitle])
    return (
      <>
        <Helmet>
          <meta
            name="description"
            content={
              register
                ? 'Please register before login'
                : 'Please login to use fully-featured realworld site. (Post articles, comments, and like, follow etc.)'
            }
          />
        </Helmet>
        <div className="auth-page">
          <div className="container page">
            <div className="row">
              <div className="col-md-6 offset-md-3 col-xs-12">
                <h1 className="text-xs-center">{title}</h1>
                <p className="text-xs-center">
                  <CustomLink
                    href={register ? routes.userLogin() : routes.userNew()}
                  >
                    {`${register ? 'Have' : 'Need'}`} an account?
                  </CustomLink>
                </p>
                <LoginForm register={register} />
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }
}

export default LoginPageHoc
