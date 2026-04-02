import { fetchTripsBetweenStations } from '../../../routes/statsApi.js'
import useApiQueryWithFilters from '../../../clients/baseApiQuery.js'

/**
 * Hook to fetch trip counts between station pairs with optional filters.
 * @param {*} filters 
 * @returns An object containing trips-between-stations data and loading/error states
 */
function useTripCounts(filters = {}) {
    const query = useApiQueryWithFilters({
        queryKey: 'trips-between-stations',
        fetcher: fetchTripsBetweenStations,
        filters,
    })

    return {
        tripCount: query.data,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useTripCounts