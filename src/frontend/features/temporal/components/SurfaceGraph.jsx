import { useCallback, useMemo, useRef, useState } from "react"
import Plot from "react-plotly.js"
import { HOUR_LABELS, DAY_LABELS, normalizeDay } from "../../../utils/config.jsx"
import StatusMessage from "../../../components/StatusMessage"
import { PAPER_RAISED, FONT_MONO, INK } from "../../../utils/editorialTokens.js"
import { EDITORIAL_COLORSCALE, editorialAxis } from "../../../utils/styling"
import { getMetricConfig } from "../utils/metric_formatter.jsx"

const INITIAL_CAMERA = {
    eye: { x: 1.6, y: -1.6, z: 0.9 },
    center: { x: 0, y: 0, z: -0.3 },
    up: { x: 0, y: 0, z: 1 },
    projection: { type: "perspective" },
}

const BASE_RADIUS_XY = Math.hypot(INITIAL_CAMERA.eye.x, INITIAL_CAMERA.eye.y)
const BASE_EYE_Z = INITIAL_CAMERA.eye.z
const AZIMUTH_PER_PIXEL = 0.01
const DEG_TO_RAD = Math.PI / 180
const MIN_ANGLE_DEG = -180
const MAX_ANGLE_DEG = 0
const DISPLAY_MIN_DEG = -90
const DISPLAY_MAX_DEG = 90
const MIN_ANGLE = MIN_ANGLE_DEG * DEG_TO_RAD
const MAX_ANGLE = MAX_ANGLE_DEG * DEG_TO_RAD
const DEFAULT_AZIMUTH = Math.atan2(INITIAL_CAMERA.eye.y, INITIAL_CAMERA.eye.x)
const INITIAL_AZIMUTH = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, DEFAULT_AZIMUTH))

function clampAzimuth(value) {
    return Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, value))
}

function buildCameraFromAzimuth(azimuth) {
    return {
        ...INITIAL_CAMERA,
        eye: {
            x: BASE_RADIUS_XY * Math.cos(azimuth),
            y: BASE_RADIUS_XY * Math.sin(azimuth),
            z: BASE_EYE_Z,
        },
    }
}

function clampDisplayAngle(value) {
    return Math.max(DISPLAY_MIN_DEG, Math.min(DISPLAY_MAX_DEG, value))
}

function azimuthToDisplayAngle(azimuth) {
    const azimuthDeg = azimuth / DEG_TO_RAD
    return clampDisplayAngle(azimuthDeg + 90)
}

function displayAngleToAzimuth(displayAngle) {
    return clampAzimuth((displayAngle - 90) * DEG_TO_RAD)
}

function buildSurfaceMatrix(data, metricGetter) {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0))

    for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const day = normalizeDay(row.day_of_week)
        const value = Number(metricGetter(row))
        grid[day][row.hour] = Number.isFinite(value) ? value : 0
    }

    return grid
}

/**
 * Component for rendering the 3D surface graph that visualizes the selected metric across days of the week and hours of the day.
 * @param {Object} data - The day-hour statistics data used to build the surface graph, containing the metric values for each day-hour combination.
 * @param {string} activeMetric - The currently selected metric key, used to determine which metric's data to display on the surface graph.
 * @param {Function} setCoordinates - Function to update the coordinates state in the parent component when the user hovers over a point on the surface graph, allowing the corresponding histograms to highlight the relevant bars based on the hovered day and hour.
 * @param {boolean} loading - Whether the temporal data is currently loading.
 * @param {Error|null} error - Error state for temporal data fetch.
 * @param {Function} onRefetch - Callback to trigger a retry after error.
 * @returns
 */
function SurfaceGraph({
    data,
    activeMetric,
    setCoordinates,
    loading,
    error,
    onRefetch,
    compareMode = false,
    layers = [],
}) {
    const safeData = Array.isArray(data) ? data : []
    const isInteractionDisabled = Boolean(loading)
    const hasSurfaceData = compareMode
        ? layers.some((layer) => Array.isArray(layer.dayHourStats) && layer.dayHourStats.length > 0)
        : safeData.length > 0
    const containerRef = useRef(null)
    const angleTrackRef = useRef(null)
    const dragPointerIdRef = useRef(null)
    const anglePointerIdRef = useRef(null)
    const dragStartXRef = useRef(0)
    const dragStartAzimuthRef = useRef(0)
    const [azimuth, setAzimuth] = useState(INITIAL_AZIMUTH)
    const [isDragging, setIsDragging] = useState(false)
    const isAngleSliderDisabled = Boolean(loading)
    const camera = useMemo(() => buildCameraFromAzimuth(azimuth), [azimuth])
    const rawDisplayAngle = useMemo(() => azimuthToDisplayAngle(azimuth), [azimuth])
    const roundedDisplayAngle = Math.round(rawDisplayAngle)
    const anglePercent = ((rawDisplayAngle - DISPLAY_MIN_DEG) / (DISPLAY_MAX_DEG - DISPLAY_MIN_DEG)) * 100
    const metric = useMemo(() => getMetricConfig(activeMetric), [activeMetric])

    const hoverTemplate = useMemo(
        () =>
            "<b>Weekly Pulse</b><br>" +
            "Day: <b>%{y}</b><br>" +
            "Hour: <b>%{x}</b><br>" +
            `Rhythm: <b>%{z}</b> ${metric.unit}<extra></extra>`,
        [metric.label]
    )

    const updateCoordinatesFromEvent = useCallback((eventData) => {
        const point = eventData?.points?.[0]
        if (!point) return

        setCoordinates({
            day: point.y,
            hour: point.x,
            value: point.z,
            layer: point?.data?.name ?? null,
        })
    }, [setCoordinates])

    const handleSurfaceClick = useCallback((eventData) => {
        updateCoordinatesFromEvent(eventData)
    }, [updateCoordinatesFromEvent])

    const handleSurfaceHover = useCallback((eventData) => {
        updateCoordinatesFromEvent(eventData)
    }, [updateCoordinatesFromEvent])

    const handleSurfaceUnhover = useCallback(() => {
        setCoordinates(null)
    }, [setCoordinates])

    const compareTraces = useMemo(() => {
        if (!compareMode || layers.length <= 1) return []

        return layers.map((layer, index) => {
            const matrix = buildSurfaceMatrix(layer.dayHourStats ?? [], metric.get)
            const isBase = index === 0
            const layerHoverTemplate =
                `<b>${layer.label}</b><br>` +
                "Day: <b>%{y}</b><br>" +
                "Hour: <b>%{x}</b><br>" +
                `Rhythm: <b>%{z}</b> ${metric.unit}<extra></extra>`

            return {
                type: "surface",
                name: layer.label,
                z: matrix,
                x: HOUR_LABELS,
                y: DAY_LABELS,
                colorscale: layer.colorscale ?? EDITORIAL_COLORSCALE,
                opacity: isBase ? 0.92 : 0.55,
                showscale: false,
                hovertemplate: layerHoverTemplate,
            }
        })
    }, [compareMode, layers, metric])

    const singleTrace = useMemo(() => ({
        type: "surface",
        z: buildSurfaceMatrix(safeData, metric.get),
        x: HOUR_LABELS,
        y: DAY_LABELS,
        colorscale: EDITORIAL_COLORSCALE,
        showscale: false,
        hovertemplate: hoverTemplate,
    }), [safeData, metric, hoverTemplate])

    const traces = compareTraces.length > 0 ? compareTraces : [singleTrace]
    const hasTraces = traces.length > 0 && traces.some((trace) => Array.isArray(trace.z) && trace.z.length > 0)
    const canSelectPoints = hasTraces && hasSurfaceData

    const maxZ = useMemo(() => {
        let zMax = 0

        for (let i = 0; i < traces.length; i++) {
            const matrix = traces[i].z
            for (let row = 0; row < matrix.length; row++) {
                for (let col = 0; col < matrix[row].length; col++) {
                    zMax = Math.max(zMax, Number(matrix[row][col]) || 0)
                }
            }
        }

        return zMax
    }, [traces])

    const handlePointerDown = useCallback((event) => {
        if (isInteractionDisabled) return
        if (event.button !== 0) return

        const container = containerRef.current
        if (!container) return

        dragPointerIdRef.current = event.pointerId
        dragStartXRef.current = event.clientX
        dragStartAzimuthRef.current = azimuth
        setIsDragging(true)
        container.setPointerCapture(event.pointerId)
    }, [azimuth, isInteractionDisabled])

    const handlePointerMove = useCallback((event) => {
        if (dragPointerIdRef.current !== event.pointerId) return

        const deltaX = event.clientX - dragStartXRef.current
        const nextAzimuth = dragStartAzimuthRef.current - deltaX * AZIMUTH_PER_PIXEL
        setAzimuth(clampAzimuth(nextAzimuth))
    }, [])

    const stopDragging = useCallback((event) => {
        if (dragPointerIdRef.current !== event.pointerId) return

        const container = containerRef.current
        if (container && container.hasPointerCapture(event.pointerId)) {
            container.releasePointerCapture(event.pointerId)
        }

        dragPointerIdRef.current = null
        setIsDragging(false)
    }, [])

    const updateAngleFromClientX = useCallback((clientX) => {
        const trackNode = angleTrackRef.current
        if (!trackNode) return

        const rect = trackNode.getBoundingClientRect()
        if (rect.width <= 0) return

        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        const nextDisplayAngle = DISPLAY_MIN_DEG + ratio * (DISPLAY_MAX_DEG - DISPLAY_MIN_DEG)
        setAzimuth(displayAngleToAzimuth(nextDisplayAngle))
    }, [])

    const handleAnglePointerDown = useCallback((event) => {
        if (isAngleSliderDisabled) return
        if (event.button !== 0) return

        event.preventDefault()
        event.stopPropagation()

        anglePointerIdRef.current = event.pointerId
        event.currentTarget.setPointerCapture(event.pointerId)
        updateAngleFromClientX(event.clientX)
    }, [isAngleSliderDisabled, updateAngleFromClientX])

    const handleAnglePointerMove = useCallback((event) => {
        if (isAngleSliderDisabled) return
        if (anglePointerIdRef.current !== event.pointerId) return

        event.preventDefault()
        event.stopPropagation()
        updateAngleFromClientX(event.clientX)
    }, [isAngleSliderDisabled, updateAngleFromClientX])

    const stopAngleDragging = useCallback((event) => {
        if (isAngleSliderDisabled) return
        if (anglePointerIdRef.current !== event.pointerId) return

        event.preventDefault()
        event.stopPropagation()

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }

        anglePointerIdRef.current = null
    }, [isAngleSliderDisabled])

    const handleAngleKeyDown = useCallback((event) => {
        if (isAngleSliderDisabled) return
        const step = event.shiftKey ? 6 : 2
        let nextDisplayAngle = null

        if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            nextDisplayAngle = clampDisplayAngle(rawDisplayAngle - step)
        }

        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            nextDisplayAngle = clampDisplayAngle(rawDisplayAngle + step)
        }

        if (nextDisplayAngle === null) return

        event.preventDefault()
        event.stopPropagation()
        setAzimuth(displayAngleToAzimuth(nextDisplayAngle))
    }, [isAngleSliderDisabled, rawDisplayAngle])

    return (
        <div
            ref={containerRef}
            className="surface-plot-3d"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            style={{ cursor: isInteractionDisabled ? "wait" : isDragging ? "grabbing" : "grab" }}
        >
            {hasTraces && (
                <Plot
                    data={traces}
                    layout={{
                        paper_bgcolor: PAPER_RAISED,
                        plot_bgcolor: PAPER_RAISED,
                        transition: {
                            duration: 420,
                            easing: "cubic-in-out",
                        },
                        scene: {
                            dragmode: false,
                            camera,
                            xaxis: editorialAxis("Hour of Day"),
                            yaxis: editorialAxis("Day of Week"),
                            zaxis: {
                                ...editorialAxis(metric.label),
                                range: [0, maxZ === 0 ? 1 : maxZ],
                            },
                            bgcolor: PAPER_RAISED,
                            aspectmode: "manual",
                            aspectratio: { x: 1.8, y: 1, z: 0.7 },
                        },
                        margin: { l: 0, r: 0, b: 0, t: 24 },
                        font: { family: FONT_MONO, color: INK, size: 12 },
                        hoverlabel: {
                            bgcolor: "rgba(11, 12, 14, 0.94)",
                            bordercolor: "rgba(25, 83, 216, 0.72)",
                            align: "left",
                            namelength: -1,
                            font: { family: FONT_MONO, size: 11, color: PAPER_RAISED },
                        },
                    }}
                    config={{
                        displayModeBar: false,
                        scrollZoom: false,
                        staticPlot: !canSelectPoints,
                    }}
                    revision={traces.length}
                    useResizeHandler
                    className="w-full h-full"
                    onClick={canSelectPoints ? handleSurfaceClick : undefined}
                    onHover={canSelectPoints ? handleSurfaceHover : undefined}
                    onUnhover={canSelectPoints ? handleSurfaceUnhover : undefined}
                />
            )}
            {(loading || error) && <StatusMessage loading={loading} error={error} onRefetch={onRefetch} />}
            <div className="surface-angle-indicator" onPointerDown={(event) => event.stopPropagation()}>
                <div className="surface-angle-row">
                    <div
                        ref={angleTrackRef}
                        className={`surface-angle-track${isAngleSliderDisabled ? " is-disabled" : ""}`}
                        role="slider"
                        tabIndex={isAngleSliderDisabled ? -1 : 0}
                        aria-label="Surface angle"
                        aria-disabled={isAngleSliderDisabled}
                        aria-valuemin={DISPLAY_MIN_DEG}
                        aria-valuemax={DISPLAY_MAX_DEG}
                        aria-valuenow={roundedDisplayAngle}
                        onPointerDown={handleAnglePointerDown}
                        onPointerMove={handleAnglePointerMove}
                        onPointerUp={stopAngleDragging}
                        onPointerCancel={stopAngleDragging}
                        onKeyDown={handleAngleKeyDown}
                    >
                        <div className="surface-angle-track__line" />
                        <div className="surface-angle-track__thumb" style={{ left: `${anglePercent}%` }} />
                    </div>
                    <div className="surface-angle-ticks">
                        <span className="surface-angle-tick">-90&deg;</span>
                        <span className="surface-angle-tick">90&deg;</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SurfaceGraph
