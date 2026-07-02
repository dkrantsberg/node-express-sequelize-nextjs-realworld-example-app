import useSWR from 'swr'

import { AUTH_COOKIE_NAME, AUTH_LOCAL_STORAGE_NAME, getCookie } from '@/auth'
import checkLogin from '@/checkLogin'
import storage from '@/localStorageHelper'

// Resolves the currently logged-in user, or null if logged out.
//
// Returns:
// - undefined while the very first read is still pending
// - null when there is no valid auth cookie (logged out)
// - the stored user object when logged in
//
// Uses the SWR key 'user' so that setupUserLocalStorage (mutate('user', ...))
// and logout (mutate('user', null) / trigger('user')) stay in sync.
export default function useLoggedInUser() {
  const { data } = useSWR('user', () => {
    const cookie = getCookie(AUTH_COOKIE_NAME)
    if (!cookie) {
      // No auth cookie: make sure any stale stored user is cleared. This also
      // covers the case where the server rotated/removed the account and the
      // cookie is gone, but a stale localStorage user lingered.
      window.localStorage.removeItem(AUTH_LOCAL_STORAGE_NAME)
      return null
    }
    return storage(AUTH_LOCAL_STORAGE_NAME) || null
  })
  if (data === undefined) return undefined
  return checkLogin(data) ? data : null
}
