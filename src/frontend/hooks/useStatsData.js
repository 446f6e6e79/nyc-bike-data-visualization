import { useQuery } from '@tanstack/react-query'
import { fetchStatsData } from '../api-data/statsApi.js'

/**
 * Hook to fetch stats data for different bike types and user types in parallel
 * @param {*} filters
 * @returns An object containing rideStats and userStats arrays with display-friendly data, along with loading and error states
 */
function useStatsData() {
  const query = useQuery({
    queryKey: ['stats-summary'],
    queryFn: fetchStatsData,
    staleTime: 10 * 60 * 1000,
  })

  return {
    rideStats: query.data?.rideStats ?? [],
    userStats: query.data?.userStats ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}

export default useStatsData