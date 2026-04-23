import { useState } from "react";
import useDayHourStats from "./useDayHourStats";
import useWeeklyStats from "./useWeeklyStats";
import useHourlyStats from "./useHourlyStats";
import useDateStats from "./useDateStats";

/**
 * Hook to manage the temporal state for the  page.
 * @param {*} filters - The filters to apply to the data.
 * @returns The state and functions for managing the temporal data.
 */
export default function useTemporalState(filters) {
    // State to track the currently active metric for the surface graph, initialized to 'total_rides'
    const [activeMetric, setActiveMetric] = useState('total_rides')
    // State to track the coordinates of the currently hovered point on the surface graph
    const [coordinates, setCoordinates] = useState(null)

    // Fetches the day-hour statistics based on the provided filters using a custom hook. The hook returns the data, loading state, and any error encountered during the fetch.
    const {
        dayHourStats,
        loading: loadingDayHourStats,
        error: errorDayHourStats,
        refetch: refetchDayHourStats,
    } = useDayHourStats(filters)
    const {
        dayStats,
        loading: loadingDayStats,
        error: errorDayStats,
        refetch: refetchDayStats,
    } = useWeeklyStats(filters)
    const {
        hourStats,
        loading: loadingHourStats,
        error: errorHourStats,
        refetch: refetchHourStats,
    } = useHourlyStats(filters)
    const {
        dateStats,
        loading: loadingDateStats,
        error: errorDateStats,
        refetch: refetchDateStats,
    } = useDateStats(filters)

    // Aggregate states
    const loading = loadingDayHourStats || loadingDayStats || loadingHourStats || loadingDateStats
    const error = errorDayHourStats || errorDayStats || errorHourStats || errorDateStats
    const refetch = () => Promise.all([
        refetchDayHourStats(),
        refetchDayStats(),
        refetchHourStats(),
        refetchDateStats(),
    ])

    return {
        activeMetric,
        setActiveMetric,
        coordinates,
        setCoordinates,
        dayHourStats,
        dayStats,
        hourStats,
        dateStats,
        loading,
        error,
        refetch,
    }
}
