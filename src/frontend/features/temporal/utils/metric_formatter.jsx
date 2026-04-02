// Utility functions and configurations for formatting and retrieving metrics
export const METRIC_FORMATTERS = {
    total_rides: value => Math.round(value).toLocaleString(),
    total_duration_minutes: value => value.toFixed(1) + " min",
    average_duration_minutes: value => value.toFixed(1) + " min",
    total_distance: value => value.toFixed(1) + " km",
    average_distance: value => value.toFixed(1) + " km",
}
// Configuration object that defines the available metrics
export const METRICS = {
    total_rides: {
        label: "Total Rides",
        unit: "rides",
        get: row => row.total_rides,
        format: METRIC_FORMATTERS.total_rides,
    },
    total_duration_minutes: {
        label: "Total Duration (min)",
        unit: "min",
        get: row => row.total_duration_seconds / 60,
        format: METRIC_FORMATTERS.total_duration_minutes,
    },
    average_duration_minutes: {
        label: "Avg Duration (min)",
        unit: "min",
        get: row => row.average_duration_seconds / 60,
        format: METRIC_FORMATTERS.average_duration_minutes,
    },
    total_distance: {
        label: "Total Distance (km)",
        unit: "km",
        get: row => row.total_distance_km,
        format: METRIC_FORMATTERS.total_distance,
    },
    average_distance: {
        label: "Avg Distance (km)",
        unit: "km",
        get: row => row.average_distance_km,
        format: METRIC_FORMATTERS.average_distance,
    },
}

// Retrieves the metric configuration for a given metric key
export const getMetricConfig = metric => METRICS[metric] ?? METRICS.total_rides
export const getMetricValue = (metric, row) => getMetricConfig(metric).get(row)

// Precompute mappings for metric getters, labels, formats, and units
export const METRIC_GETTERS = Object.fromEntries(
    Object.entries(METRICS).map(([key, config]) => [key, config.get])
)
// These mappings allow for easy access to metric labels
export const METRIC_LABELS = Object.fromEntries(
    Object.entries(METRICS).map(([key, config]) => [key, config.label])
)
// These mappings allow for easy access to metric formats
export const METRIC_FORMATS = Object.fromEntries(
    Object.entries(METRICS).map(([key, config]) => [key, config.format])
)
// These mappings allow for easy access to metric units
export const METRIC_UNITS = Object.fromEntries(
    Object.entries(METRICS).map(([key, config]) => [key, config.unit])
)
// Utility function to format a metric value based on the metric's formatting function, providing a consistent way to display metric values across the application.
export const formatMetricValue = (metric, value) => {
    const formatter = METRIC_FORMATTERS[metric]
    return formatter ? formatter(value) : String(value)
}
