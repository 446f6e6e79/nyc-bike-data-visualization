import { NavLink } from 'react-router-dom'
import DateRangeFilter from './date_filter/DateRangeFilter.jsx'
import UserFilter from './UserFilter.jsx'

const PAGES = [
    { to: '/map', label: 'Map' },
    { to: '/surface', label: 'Surface' },
    { to: '/weather', label: 'Weather' },
]

/**
 * Header component for the application, containing the title, navigation links, and the date range filter.
 * @param {*} dateRange - The currently selected date range for filtering the data, passed down to the DateRangeFilter component to control its state and behavior.
 * @param {*} onDateRangeChange - Callback function to handle changes to the date range selection, allowing the parent component to update its state and trigger data refetching based on the new date range. 
 * @param {*} currentUserFilters - The currently selected user filters for filtering the data, passed down to the UserFilter component to control its state and behavior.
 * @param {*} onUserFilterChange - Callback function to handle changes to the user filters selection, allowing the parent component to update its state and trigger data refetching based on the new user filters.
 * @returns 
 */
function AppHeader({ dateRange, onDateRangeChange, currentUserFilters, onUserFilterChange }) {
    return (
        <header className="app-header">
            <h1 className="app-title">🚲 Citi Bike Analytics</h1>
            <nav>
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
            <div className="date-filter">
                <DateRangeFilter value={dateRange} onCommit={onDateRangeChange} />
            </div>
            <div className="user-filter-header">
                <UserFilter value={currentUserFilters} onChange={onUserFilterChange} />
            </div>
        </header>
    )
}

export default AppHeader