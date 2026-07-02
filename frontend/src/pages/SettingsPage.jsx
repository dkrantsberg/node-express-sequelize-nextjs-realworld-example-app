import React from 'react'
import { useNavigate } from 'react-router-dom'
import { mutate, trigger } from 'swr'

import { AUTH_LOCAL_STORAGE_NAME, deleteCookie } from '@/auth'
import SettingsForm from '@/components/SettingsForm'
import checkLogin from '@/checkLogin'
import storage from '@/localStorageHelper'
import { AppContext } from '@/context'

const SettingsPage = () => {
  const navigate = useNavigate()
  React.useEffect(() => {
    const loggedInUser = storage(AUTH_LOCAL_STORAGE_NAME)
    const isLoggedIn = checkLogin(loggedInUser)
    if (!isLoggedIn) {
      navigate(`/`)
    }
  })
  const handleLogout = async (e) => {
    e.preventDefault()
    window.localStorage.removeItem('user')
    deleteCookie('auth')
    mutate('user', null)
    navigate(`/`)
    trigger('user')
  }
  const title = 'Your Settings'
  const { setTitle } = React.useContext(AppContext)
  React.useEffect(() => {
    setTitle(title)
  }, [setTitle, title])
  return (
    <>
      <div className="settings-page">
        <div className="container page">
          <div className="row">
            <div className="col-md-6 offset-md-3 col-xs-12">
              <h1 className="text-xs-center">{title}</h1>
              <SettingsForm />
              <hr />
              <button className="btn btn-outline-danger" onClick={handleLogout}>
                Or click here to logout.
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SettingsPage
