import axios from 'axios'

import { apiPath } from '@/config'

const TagAPI = {
  getAll: () => axios.get(`${apiPath}/tags`),
}
export default TagAPI
