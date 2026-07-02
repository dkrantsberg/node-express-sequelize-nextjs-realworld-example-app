import React from 'react'
import { useNavigate } from 'react-router-dom'

import UserAPI from '@/api/user'
import useLoggedInUser from '@/useLoggedInUser'

export const FollowUserButtonContext = React.createContext(undefined)

const FollowUserButton = ({ profile }) => {
  const loggedInUser = useLoggedInUser()
  const navigate = useNavigate()
  const { following, setFollowing } = React.useContext(FollowUserButtonContext)
  const { username } = profile
  const isCurrentUser = loggedInUser && username === loggedInUser?.username
  if (loggedInUser && isCurrentUser) {
    return null
  }
  const handleClick = (e) => {
    e.preventDefault()
    if (!loggedInUser) {
      navigate(`/user/login`)
      return
    }
    if (following) {
      UserAPI.unfollow(username)
    } else {
      UserAPI.follow(username)
    }
    setFollowing(!following)
  }
  return (
    <button
      className={`btn btn-sm action-btn ${
        following ? 'btn-secondary' : 'btn-outline-secondary'
      }`}
      onClick={handleClick}
    >
      <i className="ion-plus-round" /> &nbsp;{' '}
      {following ? 'Unfollow' : 'Follow'} {username}
    </button>
  )
}

export default FollowUserButton
