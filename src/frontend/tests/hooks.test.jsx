import { describe, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryWrapper } from './testQueryClient.jsx'

import useDatasetDateRange from '../hooks/useDatasetDateRange.js'
import useDayHourStats from '../hooks/useDayHourStats.js'
import useStationRideCounts from '../hooks/useStationRideCounts.js'
import useStationAvailability from '../hooks/useStationAvailability.js'
import useTripCounts from '../hooks/useTripCounts.js'
import useHourlyStats from '../hooks/useHourlyStats.js'
import useWeeklyStats from '../hooks/useWeeklyStats.js'
import useWeatherStats from '../hooks/useWeatherStats.js'

// Stub axios via apiClient — all hooks use apiClient.get(), which returns { data: ... }
vi.mock('../api-data/apiClient', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: { request: { use: vi.fn() } },
    },
}))
// Wrapper to provide React Query context for hooks that use it
const TEST_FILTERS = { start_date: '2026-01-01', end_date: '2026-01-31' }
const wrapper = createQueryWrapper()

// These tests primarily check that hooks resolve without throwing
describe('hooks smoke tests', () => {
    it('useDatasetDateRange resolves without throwing', async () => {
        const { result } = renderHook(() => useDatasetDateRange(), { wrapper })
        await waitFor(() => expect(result.current).toBeDefined())
    })

    it('useDayHourStats resolves without throwing', async () => {
        const { result } = renderHook(() => useDayHourStats(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current).toBeDefined())
    })

    it('useStationRideCounts resolves without throwing', async () => {
        const { result } = renderHook(() => useStationRideCounts(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current).toBeDefined())
    })

    it('useStationAvailability resolves without throwing', async () => {
        const { result } = renderHook(() => useStationAvailability(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current).toBeDefined())
    })

    it('useTripCounts resolves without throwing', async () => {
        const { result } = renderHook(() => useTripCounts(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current).toBeDefined())
    })

    it('useHourlyStats resolves without throwing', async () => {
        const { result } = renderHook(() => useHourlyStats(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current).toBeDefined())
    })

    it('useWeeklyStats resolves without throwing', async () => {
        const { result } = renderHook(() => useWeeklyStats(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current).toBeDefined())
    })

    it('useWeatherStats resolves without throwing', async () => {
        const { result } = renderHook(() => useWeatherStats(TEST_FILTERS), { wrapper })
        await waitFor(() => expect(result.current).toBeDefined())
    })
})