import { useQueries, useQuery } from '@tanstack/react-query'

/** Check if filters include a valid date range (start_date and end_date) to enable the query */
function hasDateRange(filters = {}) {
    return Boolean(filters.start_date && filters.end_date)
}
/** Check if filters include user type to enable the query */
function hasUserFilters(filters = {}) {
    return Boolean(filters.user_type)
}
/**
 * Custom hook to fetch data with optional filters using React Query.
 * @param {*} options - An object containing:
 *   - queryKey: Unique key for the query, used for caching and refetching
 *   - fetcher: Function that performs the API call, should accept filters as an argument
 *   - filters: Optional filters to pass to the fetcher function
 *   - enabledWhen: Function to determine if the query should be enabled (default checks for valid date range in filters)
 *   - staleTime: Optional override for data freshness; if omitted, QueryClient defaults are used
 *   - gcTime: Optional override for cache garbage collection; if omitted, QueryClient defaults are used
 *   - fallbackData: Data to return while loading or if there's an error (optional)
 * @returns An object containing the fetched data, loading state, error message, refetch function, and isFetching state
 */
function useApiQueryWithFilters({
    queryKey,                   
    fetcher,                    
    filters = {},               
    enabledWhen = hasDateRange || hasUserFilters,  // Default to enabling if there's a valid date range or user filters
    staleTime,                  // Undefined by default -> falls back to QueryClient defaults
    gcTime,                     // Undefined by default -> falls back to QueryClient defaults
    fallbackData = [],
}) {
    // Determine if the query should be enabled based on the provided function
    const enabled = enabledWhen(filters)

    const queryOptions = {
        queryKey: [queryKey, filters],      // Define when to refetch based on changes to filters
        queryFn: () => fetcher(filters),    // Call the fetcher function with the filters
        enabled,
        ...(staleTime !== undefined ? { staleTime } : {}),
        ...(gcTime !== undefined ? { gcTime } : {}),
    }

    const query = useQuery({
        ...queryOptions,
    })

    return {
        data: query.data ?? fallbackData,
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

/**
 * Batch variant of `useApiQueryWithFilters` used when a single hook needs to
 * run many parallel requests (e.g. compare mode rendering one request per
 * layer × breakdown). Keeps React Query's `useQueries` use-site inside the
 * clients layer so features never import from `@tanstack/react-query` directly.
 * @param {Array<object>} descriptors - Each descriptor must expose:
 *   - queryKey: unique cache key for the request
 *   - fetcher: function that accepts the descriptor's `filters` and returns data
 *   - filters: filters passed to `fetcher`
 *   - enabledWhen (optional): predicate called with `filters`; defaults to `hasDateRange`
 *   - staleTime / gcTime (optional): forwarded to React Query when provided
 * @returns {Array<object>} Array of React Query result objects, one per descriptor, in order.
 */
function useApiQueriesWithFilters(descriptors = []) {
    return useQueries({
        queries: descriptors.map(({
            queryKey,
            fetcher,
            filters = {},
            enabledWhen = hasDateRange,
            staleTime,
            gcTime,
        }) => ({
            queryKey: [queryKey, filters],
            queryFn: () => fetcher(filters),
            enabled: enabledWhen(filters),
            ...(staleTime !== undefined ? { staleTime } : {}),
            ...(gcTime !== undefined ? { gcTime } : {}),
        })),
    })
}

export { useApiQueriesWithFilters }
export default useApiQueryWithFilters