import React from 'react'
import ReactDOM from 'react-dom'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'

import App from '@/App'

// Packages.
import 'ionicons/css/ionicons.min.css'
import '@fontsource/titillium-web/700.css'
import '@fontsource/source-serif-pro/400.css'
import '@fontsource/source-serif-pro/700.css'
import '@fontsource/source-sans-pro/300.css'
import '@fontsource/source-sans-pro/400.css'
import '@fontsource/source-sans-pro/600.css'
import '@fontsource/source-sans-pro/700.css'
import '@fontsource/source-sans-pro/300-italic.css'
import '@fontsource/source-sans-pro/400-italic.css'
import '@fontsource/source-sans-pro/600-italic.css'
import '@fontsource/source-sans-pro/700-italic.css'

// In tree.
import '@/styles/demo.productionready.io.main.css'
import '@/styles/style.scss'

ReactDOM.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
