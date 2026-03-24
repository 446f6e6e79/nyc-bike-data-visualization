import { NavLink } from 'react-router-dom'
import DateRangeFilter from './utils/DateRangeFilter.jsx'

const PAGES = [
  { to: '/map', label: 'Map' },
  { to: '/stats', label: 'Stats' },
]

function AppHeader( { dateRange, onDateRangeChange } ) {
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