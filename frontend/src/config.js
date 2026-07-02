// Frontend-only configuration. The backend keeps its own separate config.
const config = {
  // API base path. Vite proxies this to the backend in dev; in production the
  // SPA is expected to be served behind the same origin as the API (or the
  // proxy target adjusted via VITE_API_TARGET).
  apiPath: '/api',
  appName: 'Conduit',
  articleLimit: 10,
  defaultProfileImage: `https://static.productionready.io/images/smiley-cyrus.jpg`,
  googleAnalyticsId: 'UA-47867706-3',
  isDemo: import.meta.env.VITE_DEMO === 'true',
  isProduction: import.meta.env.PROD,
}

export default config

export const {
  apiPath,
  appName,
  articleLimit,
  defaultProfileImage,
  googleAnalyticsId,
  isDemo,
  isProduction,
} = config
