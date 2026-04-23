import { fetchStats } from "../services/statsApi.js";
import useApiQueryWithFilters from "../../../clients/baseApiQuery.js";

/**
 * Custom hook to fetch stats grouped by day_of_week, used for surface graph rendering.
 * @param {*} filters 
 * @returns An object containing day stats data and loading/error states
 */
function useWeeklyStats(filters={}) {
    const params = { ...filters, group_by: 'day_of_week' }

    const query = useApiQueryWithFilters({
        queryKey: 'weekly-stats',
        fetcher: fetchStats,
        filters: params,
    })

    return {
        dayStats: query.data,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useWeeklyStats  