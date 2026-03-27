import { fetchStationAvailability } from '../api-data/stationApi.js'
import useApiQueryWithFilters from './baseApiQuery.js'

/**
 * Custom hook to fetch the dataset date range coverage stats
 * @returns An object containing the date range, loading state, and any error message
 */
export default function useStationAvailability() {
    const query = useApiQueryWithFilters({
        queryKey: 'station-availability',
        fetcher: fetchStationAvailability,
        // Always enable this query since it doesn't depend on user-provided filters
        enabledWhen: () => true,            
    })

    return {
        stationData: query.data,
        loading: query.loading,
        refetch : query.refetch,
        error: query.error,
    }
}