import { useQuery } from '@tanstack/react-query'

/** Check if filters include a valid date range (start_date and end_date) to enable the query */
export function hasDateRange(filters = {}) {
    return Boolean(filters.start_date && filters.end_date)
}
/**
 * Custom hook to fetch data with optional filters using React Query.
 * @param {*} options - An object containing:
 *   - queryKey: Unique key for the query, used for caching and refetching
 *   - fetcher: Function that performs the API call, should accept filters as an argument
 *   - filters: Optional filters to pass to the fetcher function
 *   - enabledWhen: Function to determine if the query should be enabled (default checks for valid date range in filters)
 *   - staleTime: Time in milliseconds before the data is considered stale (default 15 minutes)
 *   - gcTime: Time in milliseconds before unused data is garbage collected (optional)
 *   - fallbackData: Data to return while loading or if there's an error (optional)
 * @returns An object containing the fetched data, loading state, error message, refetch function, and isFetching state
 */
function useApiQueryWithFilters({
    queryKey,                   
    fetcher,                    
    filters = {},               
    enabledWhen = hasDateRange, 
    staleTime, 
    gcTime,
    fallbackData = [],
}) {
    // Determine if the query should be enabled based on the provided function
    const enabled = enabledWhen(filters)

    const query = useQuery({
        queryKey: [queryKey, filters],      // Define when to refetch based on changes to filters
        queryFn: () => fetcher(filters),    // Call the fetcher function with the filters
        enabled,                            
        staleTime,
        gcTime,
    })

    return {
        data: query.data ?? fallbackData,
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useApiQueryWithFilters
