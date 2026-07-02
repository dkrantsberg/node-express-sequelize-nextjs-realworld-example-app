import React from 'react'
import { useParams } from 'react-router-dom'
import useSWR from 'swr'

import ArticleList from '@/components/ArticleList'
import CustomLink from '@/components/CustomLink'
import CustomImage from '@/components/CustomImage'
import LoadingSpinner from '@/components/LoadingSpinner'
import EditProfileButton from '@/components/EditProfileButton'
import FollowUserButton, {
  FollowUserButtonContext,
} from '@/components/FollowUserButton'
import fetcher from '@/api'
import { apiPath } from '@/config'
import useLoggedInUser from '@/useLoggedInUser'
import { AppContext } from '@/context'
import routes from '@/routes'
import { User } from '@/models'

const ProfileHoc = (tab) => {
  return function ProfilePage() {
    const { pid } = useParams()
    const [page, setPage] = React.useState(0)
    const { data: profileApi } = useSWR(
      `${apiPath}/profiles/${pid}`,
      fetcher()
    )
    const profile = profileApi ? new User(profileApi.profile) : undefined
    const username = profile?.username
    const bio = profile?.bio
    const image = profile?.image
    const loggedInUser = useLoggedInUser()
    const isCurrentUser = loggedInUser && username === loggedInUser?.username
    const [following, setFollowing] = React.useState(false)
    React.useEffect(() => {
      setFollowing(profile?.following)
    }, [profile?.following])
    const { setTitle } = React.useContext(AppContext)
    React.useEffect(() => {
      setTitle(username)
    }, [setTitle, username])
    if (!profile) {
      return <LoadingSpinner />
    }
    return (
      <>
        <div className="profile-page">
          <div className="user-info">
            <div className="container">
              <div className="row">
                <div className="col-xs-12 col-md-10 offset-md-1">
                  <CustomImage
                    src={image}
                    alt="User's profile image"
                    className="user-img"
                  />
                  <h4>{username}</h4>
                  <p>{bio}</p>
                  <EditProfileButton isCurrentUser={isCurrentUser} />
                  <FollowUserButtonContext.Provider
                    value={{ following, setFollowing }}
                  >
                    <FollowUserButton profile={profile} />
                  </FollowUserButtonContext.Provider>
                </div>
              </div>
            </div>
          </div>
          <div className="container">
            <div className="row">
              <div className="col-xs-12 col-md-10 offset-md-1">
                <div className="articles-toggle">
                  <ul className="nav nav-pills outline-active">
                    <li className="nav-item">
                      <CustomLink
                        href={routes.userView(encodeURIComponent(username))}
                        className={`nav-link${
                          tab === 'my-posts' ? ' active' : ''
                        }`}
                      >
                        My Posts
                      </CustomLink>
                    </li>
                    <li className="nav-item">
                      <CustomLink
                        href={routes.userViewLikes(
                          encodeURIComponent(username)
                        )}
                        className={`nav-link${
                          tab === 'favorites' ? ' active' : ''
                        }`}
                      >
                        Favorited Posts
                      </CustomLink>
                    </li>
                  </ul>
                </div>
                <ArticleList
                  {...{
                    loggedInUser,
                    page,
                    setPage,
                    what: tab,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }
}

export default ProfileHoc
