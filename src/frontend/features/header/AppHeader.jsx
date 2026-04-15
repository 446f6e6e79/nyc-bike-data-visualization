import { NavLink } from 'react-router-dom'
import { useIsFetching } from '@tanstack/react-query'
import DateRangeFilter from './components/DateRangeFilter.jsx'
import useHeaderFilters from './hooks/useHeaderFilters.js'
import RiderBikeFilter from './components/RiderBikeFilter.jsx'
import { useDatasetDateRange } from './hooks/useDatasetDateRange.js'

const PAGES = [
    { to: '/map', label: 'Map' },
    { to: '/temporal', label: 'Temporal' },
    { to: '/weather', label: 'Weather' },
]

function useSafeIsFetching() {
    try {
        return useIsFetching({
            predicate: (query) => query.queryKey?.[0] !== 'dataset-date-range',
        })
    } catch (hookError) {
        if (!String(hookError?.message).includes('No QueryClient set')) throw hookError
        return 0
    }
}

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
    const activeDataFetches = useSafeIsFetching()
    const areUserFiltersDisabled = activeDataFetches > 0
    const { dateRange: datasetRange } = useDatasetDateRange()
    const kicker = datasetRange?.min_date && datasetRange?.max_date
        ? `NYC / ${datasetRange.min_date.slice(0, 4)}–${datasetRange.max_date.slice(0, 4)}`
        : 'NYC'

    return (
        <header className="app-header">
            <div className="app-header__topbar">
                <div className="app-header__brand">
                    <span className="app-header__kicker">{kicker}</span>
                    <h1 className="app-title">Citi Bike, in motion.</h1>
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
                <DateRangeFilter
                    value={dateRange}
                    onCommit={handleDateRangeCommit}
                    disabled={areUserFiltersDisabled}
                />
                <RiderBikeFilter
                    value={currentUserFilters}
                    onChange={handleUserFilterChange}
                    disabled={areUserFiltersDisabled}
                />
            </div>
        </header>
    )
}

export default AppHeader
