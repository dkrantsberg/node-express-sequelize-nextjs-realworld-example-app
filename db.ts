import path from 'path'

import { getSequelize } from './models'

// TODO sync. But we have to stop the server
// before listen for that. Don't know how to do it.
const sequelize = getSequelize(path.join(process.cwd()))

export default sequelize
