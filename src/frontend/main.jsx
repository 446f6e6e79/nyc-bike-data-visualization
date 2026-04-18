import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './styles/index.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import { queryClient } from './clients/queryClient.js'
import { applyEditorialChartDefaults } from './utils/styling'

applyEditorialChartDefaults()

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </React.StrictMode>
)
