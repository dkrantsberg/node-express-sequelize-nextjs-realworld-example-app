import { formatDate } from '@/date'
import User from '@/models/User'

/**
 * An article as the frontend models it, built from the API's article JSON.
 * The author is wrapped in the frontend User model.
 */
export default class Article {
  constructor(json = {}) {
    this.slug = json.slug
    this.title = json.title
    this.description = json.description
    this.body = json.body
    this.tagList = json.tagList || []
    this.favorited = json.favorited
    this.favoritesCount = json.favoritesCount
    this.createdAt = json.createdAt
    this.updatedAt = json.updatedAt
    this.author = new User(json.author || {})
  }

  get formattedDate() {
    return formatDate(this.createdAt)
  }

  static fromList(articles = []) {
    return articles.map((a) => new Article(a))
  }
}
