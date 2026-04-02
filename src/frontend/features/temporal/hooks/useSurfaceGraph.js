import { useMemo, useCallback } from "react"
import { normalizeDay } from "../../../utils/config.jsx"
import { getMetricConfig } from "../utils/metric_formatter.jsx"

/**
 * Hook to manage derived state and handlers for the surface graph visualization.
 * @param {Array} data - Day-hour metric rows.
 * @param {string} activeMetric - Selected metric key.
 * @param {Function} setCoordinates - Setter for selected point coordinates.
 * @returns Derived metric config, Z matrix, hover text, and click handler.
 */
export default function useSurfaceGraph({ data, activeMetric, setCoordinates }) {
    const metric = getMetricConfig(activeMetric)

    // Build the 7x24 matrix used by Plotly surface z-values.
    const Z = useMemo(() => {
        const grid = Array.from({ length: 7 }, () => Array(24).fill(0))

        for (let i = 0; i < data.length; i++) {
            const row = data[i]
            const day = normalizeDay(row.day_of_week)
            grid[day][row.hour] = metric.get(row)
        }

        return grid
    }, [data, metric])

    // Precompute the hover text for each point on the surface graph based on the Z values and the metric's formatting function, ensuring that the hover text updates efficiently when either the Z matrix or the active metric changes.
    const hoverText = useMemo(
        () => Z.map(row => row.map(value => metric.format(value))),
        [Z, metric]
    )
    // Handler for when a user clicks on a point on the surface graph, which updates the coordinates state in the parent component with the corresponding day, hour, and metric value of the clicked point. This allows the histograms to highlight the relevant bars based on the user's interaction with the surface graph.
    const handleSurfaceClick = useCallback((eventData) => {
        const point = eventData.points[0]
        setCoordinates({
            day: point.y,
            hour: point.x,
            value: point.z,
        })
    }, [setCoordinates])

    return {
        metric,
        Z,
        hoverText,
        handleSurfaceClick,
    }
}
