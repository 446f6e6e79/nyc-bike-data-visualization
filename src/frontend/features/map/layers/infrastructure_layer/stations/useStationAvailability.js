import { fetchStationAvailability } from './stationAvailabilityApi.js'
import useApiQueryWithFilters from '../../../../../clients/baseApiQuery.js'

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
        // Set a lower staleTime and gcTime since station availability are updated live
        staleTime: 5 * 60 * 1000,  // 5 minutes
        gcTime: 10 * 60 * 1000,    // 10 minutes
    })

    return {
        stationData: query.data,
        loading: query.loading,
        refetch : query.refetch,
        error: query.error,
    }
}