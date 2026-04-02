import { fetchStationRideCounts } from '../../../routes/statsApi.js'
import useApiQueryWithFilters from '../../../hooks/baseApiQuery.js'

/**
 * Hook to fetch station ride counts with optional filters.
 * The filters can include parameters like date range, bike type, user type, etc.
 * @param {*} filters 
 * @returns An object containing station ride counts and loading/error states
 */
function useStationRideCounts(filters = {}) {
    const query = useApiQueryWithFilters({
        queryKey: 'station-ride-counts',
        fetcher: fetchStationRideCounts,
        filters,
    })

    return {
        stationRideCounts: query.data,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useStationRideCounts