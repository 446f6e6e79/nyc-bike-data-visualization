import { fetchStats } from "../services/statsApi.js";
import useApiQueryWithFilters from "../../../clients/baseApiQuery.js";

/**
 * Custom hook to fetch stats grouped by calendar date, used for temporal trend rendering.
 * @param {*} filters
 * @returns An object containing date stats data and loading/error states.
 */
function useDateStats(filters = {}) {
    const params = { ...filters, group_by: "date" };

    const query = useApiQueryWithFilters({
        queryKey: "date-stats",
        fetcher: fetchStats,
        filters: params,
    });

    return {
        dateStats: query.data,
        loading: query.loading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
    };
}

export default useDateStats;
