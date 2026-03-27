import { useState } from "react";
import useDayHourStats from "../hooks/useDayHourStats";
import SurfaceSelector from "../components/surface/SurfaceSelector";
import StatusMessage from "../components/StatusMessage";
import SurfaceGraph from "../components/surface/SurfaceGraph";
import SurfaceHistograms from "../components/surface/SurfaceHistograms";

// Definitions for the metrics with their keys, labels, and formatting
export const METRIC_GETTERS = {
    total_rides: d => d.total_rides,
    total_duration_minutes: d => d.total_duration_seconds / 60,
    average_duration_minutes: d => d.average_duration_seconds / 60,
    total_distance: d => d.total_distance_km,
    average_distance: d => d.average_distance_km,
}

export const METRIC_LABELS = {
    total_rides: "Total Rides",
    total_duration_minutes: "Total Duration (min)",
    average_duration_minutes: "Avg Duration (min)",
    total_distance: "Total Distance (km)",
    average_distance: "Avg Distance (km)",
}

export const METRIC_FORMATS = {
    total_rides: v => Math.round(v).toLocaleString(),
    total_duration_minutes: v => v.toFixed(1) + " min",
    average_duration_minutes: v => v.toFixed(1) + " min",
    total_distance: v => v.toFixed(1) + " km",
    average_distance: v => v.toFixed(1) + " km",
}

/**
 * Component for the surface graph page, which includes a metric selector, the surface graph itself, and accompanying histograms. 
 * @param {Object} filters - The filters to apply to the data.
 * @returns The rendered SurfacePage component, which displays the surface graph and histograms based on the selected metric and applied filters.
 */
function SurfacePage({filters}) {
    //#TODO: From this file and his children refactor the CSS inline styles to a file
    // State to track the currently active metric for the surface graph, initialized to 'total_rides'
    const [activeMetric, setActiveMetric] = useState('total_rides')
    // State to track the coordinates of the currently hovered point on the surface graph
    const [coordinates, setCoordinates] = useState(null)
    // Fetches the day-hour statistics based on the provided filters using a custom hook. The hook returns the data, loading state, and any error encountered during the fetch.
    const { dayHourStats, loading, error } = useDayHourStats(filters)

    if (loading || error) {
        return <StatusMessage loading={loading} error={error} />
    }

    return (
        <>
            <SurfaceSelector activeMetric={activeMetric} setActiveMetric={setActiveMetric} />
            <SurfaceGraph data={dayHourStats} activeMetric={activeMetric} setCoordinates={setCoordinates} />
            <SurfaceHistograms data={dayHourStats} activeMetric={activeMetric} coordinates={coordinates} />
        </>
    );
}

export default SurfacePage;