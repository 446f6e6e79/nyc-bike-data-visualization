import { fetchStats } from "../api-data/statsApi";
import useApiQueryWithFilters from "./baseApiQuery.js";

/**
 * Custom hook to fetch stats grouped by day_of_week and hour, used for surface graph rendering.
 * @param {*} filters 
 * @returns An object containing day-hour stats data and loading/error states
 */
function useDayHourStats(filters={}) {
    const params = { ...filters, group_by: 'day_of_week,hour' }

    const query = useApiQueryWithFilters({
        queryKey: 'day-hour-stats',
        fetcher: fetchStats,
        filters: params,
    })

    return {
        dayHourStats: query.data,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useDayHourStats  