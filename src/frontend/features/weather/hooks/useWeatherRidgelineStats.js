import { fetchStatsByWeather } from "../services/statsByWeatherApi.js";
import useApiQueryWithFilters from "../../../clients/baseApiQuery.js";

/**
 * Fetch weather stats grouped by day_of_week and hour for ridgeline distributions.
 * @param {*} filters
 * @returns Query payload and status fields.
 */
function useWeatherRidgelineStats(filters = {}) {
    const params = { ...filters, group_by: "day_of_week,hour" };

    const query = useApiQueryWithFilters({
        queryKey: "weather-ridgeline-stats",
        fetcher: fetchStatsByWeather,
        filters: params,
    });

    return {
        ridgelineStats: query.data,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    };
}

export default useWeatherRidgelineStats;
