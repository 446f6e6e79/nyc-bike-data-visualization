import { describe, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import useStatsData from '../hooks/useStatsData'

/*
    These tests primarily check that the hook resolves without throwing, both in loading and loaded states.
*/

// Stub fetch for the hook, returning consistent data for all endpoints it calls
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
  
  // Map of endpoint suffixes to mock responses
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

describe('useStatsData — resolves without throwing', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', stubFetch())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('finishes loading and returns data', async () => {
    const { result } = renderHook(() => useStatsData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(Array.isArray(result.current.rideStats)).toBe(true)
    expect(Array.isArray(result.current.userStats)).toBe(true)
    expect(Array.isArray(result.current.dailyStats)).toBe(true)
  })
})