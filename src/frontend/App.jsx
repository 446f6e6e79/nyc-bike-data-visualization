import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppHeader from './components/AppHeader.jsx'
import StatsPage from './pages/StatsPage.jsx'
import MapPage from './pages/MapPage.jsx'
import SurfacePage from './pages/SurfacePage.jsx'

/**
 * App component that sets up the main structure of the application, including routing and layout. 
 * Defines routes for the map and stats pages, and includes a header that is displayed on all pages.
 * @returns 
 */
function App() {
    // Header state for filters
    const [dateRange, setDateRange] = useState(null)
    const [currentUserFilters, setCurrentUserFilters] = useState({})
    // Combine filters into a single object to pass down to pages
    const filters = { ...dateRange, ...currentUserFilters }

    return (
        <BrowserRouter>
            <div className="app-shell">
                <AppHeader dateRange={dateRange} onDateRangeChange={setDateRange} currentUserFilters={currentUserFilters} onUserFilterChange={setCurrentUserFilters} />
                <div className="app-content">
                    <Routes>
                        <Route path="/" element={<Navigate to="/map" replace />} />
                        <Route path="/map" element={<MapPage filters={filters} />} />
                        <Route path="/surface" element={<SurfacePage filters={filters} />} />
                        <Route path="/stats" element={<StatsPage filters={filters} />} />
                        {/* add future pages here */}
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    )
}

export default App