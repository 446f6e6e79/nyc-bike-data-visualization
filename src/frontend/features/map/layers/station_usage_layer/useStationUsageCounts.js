import { fetchStationUsageCounts } from './stationUsageCountsApi.js'
import useApiQueryWithFilters from '../../../../clients/baseApiQuery.js'

/**
 * Hook to fetch station usage counts with optional filters.
 * The filters can include parameters like date range, bike type, user type, etc.
 * @param {*} filters 
 * @returns An object containing station usage counts and loading/error states
 */
function useStationUsageCounts(filters = {}) {
    const query = useApiQueryWithFilters({
        queryKey: 'station-usage-counts',
        fetcher: fetchStationUsageCounts,
        filters,
    })

    return {
        stationUsageCounts: query.data,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useStationUsageCounts