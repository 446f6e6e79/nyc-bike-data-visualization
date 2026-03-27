import { NavLink } from 'react-router-dom'
import DateRangeFilter from './date_filter/DateRangeFilter.jsx'

const PAGES = [
    { to: '/map', label: 'Map' },
    { to: '/surface', label: 'Surface' },
    { to: '/stats', label: 'Stats' }
]

/**
 * Header component for the application, containing the title, navigation links, and the date range filter.
 * @param {*} dateRange - The currently selected date range for filtering the data, passed down to the DateRangeFilter component to control its state and behavior.
 * @param {*} onDateRangeChange - Callback function to handle changes to the date range selection, allowing the parent component to update its state and trigger data refetching based on the new date range. 
 * @returns 
 */
function AppHeader({ dateRange, onDateRangeChange }) {
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
        </header>
    )
}

export default AppHeader