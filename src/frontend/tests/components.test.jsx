import { describe, it, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

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

const DAILY_ITEMS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
].map(day => ({ day_of_week: day, stats: { total_rides: 0 } }))

const METRICS = [
  { label: 'Total Rides', key: 'total_rides', formatter: v => v.toLocaleString() },
  { label: 'Avg Duration (min)', key: 'average_duration_minutes', formatter: v => v.toFixed(1) },
  { label: 'Total Distance (km)', key: 'total_distance_km', formatter: v => v.toFixed(0) },
]

function stubFetch() {
  const makeStats = rides => ({
    stats: {
      total_rides: rides,
      average_duration_seconds: 600,
      average_distance_km: 2,
      total_duration_seconds: 0,
      total_distance_km: 0,
    },
  })

  const daily = 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'
    .split(',')
    .map(d => ({ day_of_week: d, ...makeStats(10) }))

  return vi.fn(url => {
    const map = {
      '/statistics/ride-types/classic_bike': { rideable_type: 'classic_bike', ...makeStats(300) },
      '/statistics/ride-types/electric_bike': { rideable_type: 'electric_bike', ...makeStats(150) },
      '/statistics/user-types/member': { user_type: 'member', ...makeStats(400) },
      '/statistics/user-types/casual': { user_type: 'casual', ...makeStats(50) },
      '/statistics/day': daily,
    }

    const data = Object.entries(map).find(([k]) => url.endsWith(k))?.[1] ?? null
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) })
  })
}

describe('AppHeader — renders without crashing', () => {
  it('mounts', () => {
    render(<AppHeader />)
  })
})

describe('StatusMessage — renders without crashing', () => {
  it('loading state', () => {
    render(<StatusMessage loading={true} error={null} />)
  })

  it('error state', () => {
    render(<StatusMessage loading={false} error="oops" />)
  })

  it('idle state', () => {
    render(<StatusMessage loading={false} error={null} />)
  })
})

describe('StatCard — renders without crashing', () => {
  it('with a value', () => {
    render(<StatCard label="Rides" value="1,234" />)
  })

  it('without a value', () => {
    render(<StatCard label="Rides" value={undefined} />)
  })
})

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

describe('DailyStatsBarChart — renders without crashing', () => {
  it('with a full week of data', () => {
    render(<DailyStatsBarChart items={DAILY_ITEMS} />)
  })

  it('with empty data', () => {
    render(<DailyStatsBarChart items={[]} />)
  })
})

describe('App — renders without crashing', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', stubFetch())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mounts in loading state', () => {
    render(<App />)
  })

  it('mounts and finishes loading', async () => {
    const { getByText } = render(<App />)
    await waitFor(() => getByText('By Rideable Type'))
  })
})