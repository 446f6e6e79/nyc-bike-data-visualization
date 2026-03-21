import { NavLink } from 'react-router-dom'

const PAGES = [
  { to: '/map', label: 'Map' },
  { to: '/stats', label: 'Stats' },
]

function AppHeader() {
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
    </header>
  )
}

export default AppHeader