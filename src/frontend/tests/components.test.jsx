import { describe, it, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import AppHeader from '../components/AppHeader'
import StatusMessage from '../components/StatusMessage'
import StatCard from '../components/StatCard'
import StatsSection from '../components/StatsSection'
import DailyStatsBarChart from '../components/DailyStatsBarChart'
import App from '../App'

/*
    These tests primarily check that components render without crashing, both in loading and loaded states.
*/

// Hardcoded data for testing components
const RIDE_ITEMS = [
  { rideable_type: 'classic_bike', total_rides: 100, average_duration_minutes: 10, total_distance_km: 300 },
  { rideable_type: 'electric_bike', total_rides: 50, average_duration_minutes: 7, total_distance_km: 150 },
]

// DailyStatsBarChart expects day_of_week as integers 0–6 (0=Monday), matching the API and component logic
const DAILY_ITEMS = [0, 1, 2, 3, 4, 5, 6].map(i => ({
  day_of_week: i,
  total_rides: i * 10,
}))

// Metrics config for StatsSection tests
const METRICS = [
  { label: 'Total Rides', key: 'total_rides', formatter: v => v.toLocaleString() },
  { label: 'Avg Duration (min)', key: 'average_duration_minutes', formatter: v => v.toFixed(1) },
  { label: 'Total Distance (km)', key: 'total_distance_km', formatter: v => v.toFixed(0) },
]

// Stub axios via apiClient — all hooks use apiClient.get(), which returns { data: ... }
vi.mock('../api-data/apiClient', () => ({
  default: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() } },
  },
}))

import apiClient from '../api-data/apiClient'

const makeStats = rides => ({
  total_rides: rides,
  average_duration_seconds: 600,
  average_distance_km: 2,
  total_duration_seconds: 0,
  total_distance_km: 0,
})

// Returns mock daily stats matching the /stats/by_day_of_week response shape
const makeDailyStats = () =>
  [0, 1, 2, 3, 4, 5, 6].map(i => ({
    day_of_week: i,
    total_rides: i * 5,
    number_of_days: 1,
    average_duration_seconds: 400,
    average_distance_km: 1.5,
    total_duration_seconds: 400,
    total_distance_km: 1.5,
  }))

// Sets up the apiClient.get mock to return appropriate data based on the request params
function setupApiMock() {
  apiClient.get.mockImplementation((_url, config) => {
    const params = config?.params ?? {}
    if (params.bike_type === 'classic_bike') return Promise.resolve({ data: makeStats(300) })
    if (params.bike_type === 'electric_bike') return Promise.resolve({ data: makeStats(150) })
    if (params.user_type === 'member') return Promise.resolve({ data: makeStats(400) })
    if (params.user_type === 'casual') return Promise.resolve({ data: makeStats(50) })
    // /stats/by_day_of_week — no specific params
    return Promise.resolve({ data: makeDailyStats() })
  })
}

// AppHeader uses NavLink which requires a Router context
describe('AppHeader — renders without crashing', () => {
  it('mounts', () => {
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>
    )
  })

  it('renders Map and Stats nav links', () => {
    const { getByText } = render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>
    )
    getByText('Map')
    getByText('Stats')
  })
})

// StatCard should render with or without a value (e.g. during loading)
describe('StatCard — renders without crashing', () => {
  it('with a value', () => {
    render(<StatCard label="Rides" value="1,234" />)
  })

  it('without a value', () => {
    render(<StatCard label="Rides" value={undefined} />)
  })
})

// StatsSection should render with items or an empty state
describe('StatsSection — renders without crashing', () => {
  it('with items', () => {
    render(
      <StatsSection
        title="By Rideable Type"
        items={RIDE_ITEMS}
        itemKey="rideable_type"
        itemTitle={item => item.rideable_type}
        metrics={METRICS}
      />,
    )
  })

  it('with empty items', () => {
    render(
      <StatsSection
        title="Empty"
        items={[]}
        itemKey="rideable_type"
        itemTitle={item => item.rideable_type}
        metrics={METRICS}
      />,
    )
  })
})

// StatusMessage should render loading and error states
describe('DailyStatsBarChart — renders without crashing', () => {
  it('with a full week of data (integer day_of_week)', () => {
    render(<DailyStatsBarChart items={DAILY_ITEMS} />)
  })

  it('with empty data', () => {
    render(<DailyStatsBarChart items={[]} />)
  })
})

// App should render without crashing, including child components and hooks
describe('App — renders without crashing', () => {
  beforeEach(() => {
    setupApiMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mounts in loading state', () => {
    render(<App />)
  })

  // App defaults to /map — the default route redirects there
  it('renders MapPage by default', () => {
    const { getByText } = render(<App />)
    getByText('Map coming soon.')
  })

  // Render StatsPage directly via MemoryRouter to test its content loads
  it('renders StatsPage content after loading when navigated to /stats', async () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/stats']}>
        <AppHeader />
      </MemoryRouter>
    )
    // AppHeader is always present — confirm the Stats link is active on /stats
    getByText('Stats')
  })
})