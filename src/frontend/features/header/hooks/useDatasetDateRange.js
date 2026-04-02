import { fetchDateRange } from '../services/fetchDateRange.js'
import useApiQueryWithFilters from '../../../clients/baseApiQuery.js'

/**
 * Custom hook to fetch the dataset date range coverage stats
 * @returns An object containing the date range, loading state, and any error message
 */
export function useDatasetDateRange() {
    try {
        const query = useApiQueryWithFilters({
            queryKey: 'dataset-date-range',
            fetcher: fetchDateRange,
            enabledWhen: () => true,            // Always enable this query since it doesn't depend on user-provided filters
            staleTime: Number.POSITIVE_INFINITY,
            gcTime: Number.POSITIVE_INFINITY,
            fallbackData: null,
        })

        return {
            dateRange: query.data,
            loading: query.loading,
            error: query.error,
            refetch: query.refetch,
        }
    } catch (hookError) {
        if (!String(hookError?.message).includes('No QueryClient set')) throw hookError

        return { dateRange: null, loading: false, error: null }
    }
}


