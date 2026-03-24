import { useQuery } from '@tanstack/react-query'
import { fetchDailyStats } from '../api-data/statsApi.js'

/**
 * Hook to fetch daily stats grouped by day of the week
 * @returns An object containing daily stats and loading/error states
 */
function useDailyStats(dateRange) {
  const filters = dateRange ?? {}
  const hasDateRange = Boolean(filters.start_date && filters.end_date)

  const query = useQuery({
    queryKey: ['daily-stats', filters],
    queryFn: () => fetchDailyStats(filters),
    enabled: hasDateRange,
    staleTime: 30 * 60 * 1000, // Data is considered fresh for 30 minutes
  })

  return {
    dailyStats: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}

export default useDailyStats