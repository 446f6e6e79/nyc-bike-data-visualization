import { useQuery } from '@tanstack/react-query'
import { fetchTripsBetweenStations } from '../api-data/statsApi.js'

/**
 * Hook to fetch trip counts between station pairs with optional filters.
 * @param {*} filters 
 * @returns An object containing trips-between-stations data and loading/error states
 */
function useTripsBetweenStations(filters = {}, options = {}) {
    // Controls wether the query is enabled or not
    const { enabled = true } = options

    const query = useQuery({
        queryKey: ['trips-between-stations', filters],
        queryFn: () => fetchTripsBetweenStations(filters),
        enabled,
        staleTime: 15 * 60 * 1000, // Cache data for 15 minutes
    })

    return {
        tripsBetweenStations: query.data ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useTripsBetweenStations