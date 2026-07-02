import { defaultProfileImage } from '@/config'

/**
 * A user/profile as the frontend models it. Built from the API's profile JSON.
 * This is the frontend's own model — intentionally decoupled from the backend
 * Sequelize model.
 */
export default class User {
  constructor(json = {}) {
    this.username = json.username
    this.bio = json.bio
    this.image = json.image
    this.following = json.following
  }

  // Image to actually render, falling back to the shared placeholder.
  get displayImage() {
    return this.image || defaultProfileImage
  }
}
