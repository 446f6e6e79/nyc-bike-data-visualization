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
    const [isTemporalCompareActive, setIsTemporalCompareActive] = useState(false)
    // Prefetch data for the current filters (this will be cached by the hooks)
    prefetchData(filters)
    return (
        <BrowserRouter>
            <div className="app-shell">
                <AppHeader
                    filters={filters}
                    onFiltersChange={setFilters}
                    forceDisableFilters={isTemporalCompareActive}
                />
                <main className="app-content">
                    <div className="page-shell">
                        <Routes>
                            <Route path="/" element={<Navigate to="/map" replace />} />
                            <Route path="/map" element={<MapPage filters={filters} />} />
                            <Route
                                path="/temporal"
                                element={
                                    <TemporalPage
                                        filters={filters}
                                        onCompareModeChange={setIsTemporalCompareActive}
                                    />
                                }
                            />
                            <Route path="/weather" element={<WeatherPage filters={filters} />} />
                        </Routes>
                    </div>
                </main>
                <footer className="app-footer">
                    <p className="app-footer__text">
                        <span>Made with</span>
                        <span className="app-footer__heart-wrap" aria-hidden="true">
                            <svg className="app-footer__heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </span>
                        <span>by Davide Donà, Andrea Blushi & Lorenzo Di Berardino</span>
                    </p>
                </footer>
            </div>
        </BrowserRouter>
    )
}

export default App