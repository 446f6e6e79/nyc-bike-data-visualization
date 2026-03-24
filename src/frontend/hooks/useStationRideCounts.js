import { useQuery } from '@tanstack/react-query'
import { fetchStationRideCounts } from '../api-data/stationApi.js'

/**
 * Hook to fetch station ride counts with optional filters.
 * The filters can include parameters like date range, bike type, user type, etc.
 * @param {*} filters 
 * @returns An object containing station ride counts and loading/error states
 */
function useStationRideCounts(filters = {}, options = {}) {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: ['station-ride-counts', filters],
    queryFn: () => fetchStationRideCounts(filters),
    enabled,
    staleTime: 15 * 60 * 1000,
  })

  return {
    stationRideCounts: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}

export default useStationRideCounts