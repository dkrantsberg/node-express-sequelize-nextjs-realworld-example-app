import { formatDate } from '@/date'
import User from '@/models/User'

/**
 * A comment as the frontend models it, built from the API's comment JSON.
 */
export default class Comment {
  constructor(json = {}) {
    this.id = json.id
    this.body = json.body
    this.slug = json.slug
    this.createdAt = json.createdAt
    this.updatedAt = json.updatedAt
    this.author = new User(json.author || {})
  }

  get formattedDate() {
    return formatDate(this.createdAt)
  }

  static fromList(comments = []) {
    return comments.map((c) => new Comment(c))
  }
}
