import { useQuery } from '@tanstack/react-query'
import { fetchDailyStats } from '../api-data/statsApi.js'

/**
 * Hook to fetch daily stats grouped by day of the week
 * @returns An object containing daily stats and loading/error states
 */
function useDailyStats(dateRange) {
  const filters = dateRange ?? {}

  const query = useQuery({
    queryKey: ['daily-stats', filters],
    queryFn: () => fetchDailyStats(filters),
    enabled: filters != {}, // Only run the query if filters are provided
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