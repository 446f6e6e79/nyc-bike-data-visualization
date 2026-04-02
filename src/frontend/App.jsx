import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppHeader from './features/header/AppHeader.jsx'
import MapPage from './features/map/MapPage.jsx'
import TemporalPage from './features/temporal/TemporalPage.jsx'
import WeatherPage from './features/weather/WeatherPage.jsx'
import prefetchData from './utils/prefetcher.js'

/**
 * App component that sets up the main structure of the application, including routing and layout. 
 * Defines routes for the map and stats pages, and includes a header that is displayed on all pages.
 * @returns 
 */
function App() {
    const [filters, setFilters] = useState({})
    // Prefetch data for the current filters (this will be cached by the hooks)
    prefetchData(filters)
    return (
        <BrowserRouter>
            <div className="app-shell">
                <AppHeader filters={filters} onFiltersChange={setFilters} />
                <div className="app-content">
                    <Routes>
                        <Route path="/" element={<Navigate to="/map" replace />} />
                        <Route path="/map" element={<MapPage filters={filters} />} />
                        <Route path="/temporal" element={<TemporalPage filters={filters} />} />
                        <Route path="/weather" element={<WeatherPage filters={filters} />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    )
}

export default App