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
    const hoverTemplate =
        "<b>%{y}</b><br>" +
        "Hour: %{x}<br>" +
        `${metric.label}: <b>%{z}</b><extra></extra>`

    // Build the 7x24 matrix used by Plotly surface z-values.
    const Z = useMemo(() => {
        const grid = Array.from({ length: 7 }, () => Array(24).fill(0))

        for (let i = 0; i < data.length; i++) {
            const row = data[i]
            const day = normalizeDay(row.day_of_week)
            const value = Number(metric.get(row))
            grid[day][row.hour] = Number.isFinite(value) ? value : 0
        }

        return grid
    }, [data, metric])

    const updateCoordinatesFromEvent = useCallback((eventData) => {
        const point = eventData?.points?.[0]
        if (!point) return

        setCoordinates({
            day: point.y,
            hour: point.x,
            value: point.z,
        })
    }, [setCoordinates])

    // Click keeps existing behavior for explicit selection.
    const handleSurfaceClick = useCallback((eventData) => {
        updateCoordinatesFromEvent(eventData)
    }, [updateCoordinatesFromEvent])

    // Hover updates highlights immediately while moving on the 3D surface.
    const handleSurfaceHover = useCallback((eventData) => {
        updateCoordinatesFromEvent(eventData)
    }, [updateCoordinatesFromEvent])

    const handleSurfaceUnhover = useCallback(() => {
        setCoordinates(null)
    }, [setCoordinates])

    return {
        metric,
        Z,
        hoverTemplate,
        handleSurfaceClick,
        handleSurfaceHover,
        handleSurfaceUnhover,
    }
}
