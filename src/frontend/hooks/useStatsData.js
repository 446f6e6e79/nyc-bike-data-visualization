import { fetchStatsData } from '../api-data/statsApi.js'
import useApiQueryWithFilters from './baseApiQuery.js'

/**
 * Hook to fetch stats data for different bike types and user types in parallel
 * @param {Object} filters
 * @returns An object containing rideStats and userStats arrays with display-friendly data, along with loading and error states
 */
function useStatsData(filters = {}) {
    const query = useApiQueryWithFilters({
        queryKey: 'stats-summary',
        fetcher: fetchStatsData,
        filters,
        fallbackData: { rideStats: [], userStats: [] },
    })

    return {
        rideStats: query.data.rideStats,
        userStats: query.data.userStats,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useStatsData