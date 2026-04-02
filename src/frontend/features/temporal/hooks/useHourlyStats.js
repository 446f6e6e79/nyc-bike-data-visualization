import { fetchStats } from "../../../routes/statsApi.js";
import useApiQueryWithFilters from "../../../hooks/baseApiQuery.js";

/**
 * Custom hook to fetch stats grouped by hour, used for surface graph rendering.
 * @param {*} filters 
 * @returns An object containing hour stats data and loading/error states
 */
function useHourlyStats(filters={}) {
    const params = { ...filters, group_by: 'hour' }

    const query = useApiQueryWithFilters({
        queryKey: 'hourly-stats',
        fetcher: fetchStats,
        filters: params,
    })

    return {
        hourStats: query.data,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useHourlyStats  