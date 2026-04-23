import { fetchStationFlowCounts } from './stationFlowCountsApi.js'
import useApiQueryWithFilters from '../../../../../clients/baseApiQuery.js'

/**
 * Hook to fetch station flow counts with optional filters.
 * @param {*} filters 
 * @returns An object containing station flow counts data and loading/error states
 */
function useStationFlowCounts(filters = {}) {
    const query = useApiQueryWithFilters({
        queryKey: 'station-flow-counts',
        fetcher: fetchStationFlowCounts,
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

export default useStationFlowCounts