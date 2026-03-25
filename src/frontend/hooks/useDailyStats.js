import { fetchDailyStats } from '../api-data/statsApi.js'
import useApiQueryWithFilters from './baseApiQuery.js'

/**
 * Hook to fetch daily stats grouped by day of the week
 * @param {Object} filters
 * @returns An object containing daily stats and loading/error states
 */
function useDailyStats(filters = {}) {
    const query = useApiQueryWithFilters({
        queryKey: 'daily-stats',
        fetcher: fetchDailyStats,
        filters,
    })

    return {
        dailyStats: query.data,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useDailyStats