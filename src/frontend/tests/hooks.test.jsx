import { describe, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import useStatsData from '../hooks/useStatsData'
import useDailyStats from '../hooks/useDailyStats'

import { createQueryWrapper } from './testQueryClient.jsx'

/*
These tests primarily check that hooks resolve without throwing, both in loading and loaded states.
*/

// Stub axios via apiClient — hooks use apiClient.get(), which returns { data: ... }
vi.mock('../api-data/apiClient', () => ({
    default: {
        get: vi.fn(),
        interceptors: { request: { use: vi.fn() } },
    },
}))

import apiClient from '../api-data/apiClient'

const TEST_FILTERS = {
    start_date: '2026-01-01',
    end_date: '2026-01-31',
}

// Returns mock stats matching the /stats response shape
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

describe('useStatsData — resolves without throwing', () => {
    beforeEach(() => {
        setupApiMock()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('starts in loading state', () => {
        const wrapper = createQueryWrapper()
        const { result } = renderHook(() => useStatsData(TEST_FILTERS), { wrapper })
        expect(result.current.loading).toBe(true)
        expect(result.current.error).toBeNull()
    })

    it('finishes loading and returns rideStats and userStats', async () => {
        const wrapper = createQueryWrapper()
        const { result } = renderHook(() => useStatsData(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.error).toBeNull()
        expect(Array.isArray(result.current.rideStats)).toBe(true)
        expect(Array.isArray(result.current.userStats)).toBe(true)
        expect(result.current.rideStats).toHaveLength(2)
        expect(result.current.userStats).toHaveLength(2)
    })

    it('rideStats entries have rideable_type and derived duration fields', async () => {
        const wrapper = createQueryWrapper()
        const { result } = renderHook(() => useStatsData(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        for (const entry of result.current.rideStats) {
            expect(entry).toHaveProperty('rideable_type')
            expect(entry).toHaveProperty('average_duration_minutes')
            expect(entry).toHaveProperty('total_duration_minutes')
        }
    })

    it('userStats entries have user_type and derived duration fields', async () => {
        const wrapper = createQueryWrapper()
        const { result } = renderHook(() => useStatsData(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        for (const entry of result.current.userStats) {
            expect(entry).toHaveProperty('user_type')
            expect(entry).toHaveProperty('average_duration_minutes')
            expect(entry).toHaveProperty('total_duration_minutes')
        }
    })

    it('exposes a refetch function', async () => {
        const wrapper = createQueryWrapper()
        const { result } = renderHook(() => useStatsData(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(typeof result.current.refetch).toBe('function')
    })
})

describe('useDailyStats — resolves without throwing', () => {
    beforeEach(() => {
        setupApiMock()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('starts in loading state', () => {
        const wrapper = createQueryWrapper()
        const { result } = renderHook(() => useDailyStats(TEST_FILTERS), { wrapper })
        expect(result.current.loading).toBe(true)
        expect(result.current.error).toBeNull()
    })

    it('finishes loading and returns dailyStats with 7 entries', async () => {
        const wrapper = createQueryWrapper()
        const { result } = renderHook(() => useDailyStats(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.error).toBeNull()
        expect(Array.isArray(result.current.dailyStats)).toBe(true)
        expect(result.current.dailyStats).toHaveLength(7)
    })

    it('each dailyStats entry has day_of_week as an integer 0–6', async () => {
        const wrapper = createQueryWrapper()
        const { result } = renderHook(() => useDailyStats(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))

        result.current.dailyStats.forEach((entry, i) => {
            expect(entry.day_of_week).toBe(i)
        })
    })

    it('exposes a refetch function', async () => {
        const wrapper = createQueryWrapper()
        const { result } = renderHook(() => useDailyStats(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(typeof result.current.refetch).toBe('function')
    })
})
