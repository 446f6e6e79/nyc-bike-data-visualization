import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './styles/index.css'
import { queryClient } from './api-data/queryClient'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    { /** Wrapper for the entire app, in order to provide query client context */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
