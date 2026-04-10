import { NavLink } from 'react-router-dom'
import DateRangeFilter from './components/DateRangeFilter.jsx'
import useHeaderFilters from './hooks/useHeaderFilters.js'
import RiderBikeFilter from './components/RiderBikeFilter.jsx'

const PAGES = [
    { to: '/map', label: 'Map' },
    { to: '/temporal', label: 'Temporal' },
    { to: '/weather', label: 'Weather' },
]

/**
 * Header component for the application, containing the title, navigation links, and the date range filter.
 * @returns
 */
function AppHeader({ onFiltersChange }) {
    const {
        dateRange,
        currentUserFilters,
        handleDateRangeCommit,
        handleUserFilterChange,
    } = useHeaderFilters(onFiltersChange)

    return (
        <header className="app-header">
            <div className="app-header__topbar">
                <div className="app-header__brand">
                    <h1 className="app-title">Citi Bike Analytics</h1>
                </div>
                <nav className="app-header__nav">
                    {PAGES.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>
            </div>
            <div className="app-header__filters">
                <DateRangeFilter value={dateRange} onCommit={handleDateRangeCommit} />
                <RiderBikeFilter value={currentUserFilters} onChange={handleUserFilterChange} />
            </div>
        </header>
    )
}

export default AppHeader
