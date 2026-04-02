import { fetchStats } from "../routes/statsApi.js";
import useApiQueryWithFilters from "./baseApiQuery.js";

/**
 * Custom hook to fetch stats grouped by weather, used for surface graph rendering.
 * @param {*} filters 
 * @returns An object containing weather stats data and loading/error states
 */
function useWeatherStats(filters={}) {
    const params = { ...filters, group_by: 'weather' }

    const query = useApiQueryWithFilters({
        queryKey: 'weather-stats',
        fetcher: fetchStats,
        filters: params,
    })

    return {
        weatherStats: query.data,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    }
}

export default useWeatherStats  