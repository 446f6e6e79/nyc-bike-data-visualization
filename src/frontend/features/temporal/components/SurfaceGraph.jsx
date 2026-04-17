import { useCallback, useMemo, useRef, useState } from "react"
import Plot from "react-plotly.js"
import { HOUR_LABELS, DAY_LABELS } from "../../../utils/config.jsx"
import useSurfaceGraph from "../hooks/useSurfaceGraph"
import StatusMessage from "../../../components/StatusMessage"
import { PAPER_RAISED, FONT_MONO, INK } from "../../../utils/editorialTokens.js"
import { EDITORIAL_COLORSCALE, editorialAxis } from "../../../utils/styling"

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
function SurfaceGraph({ data, activeMetric, setCoordinates, loading, error, onRefetch }) {
    const safeData = Array.isArray(data) ? data : []
    const hasData = safeData.length > 0
    const containerRef = useRef(null)
    const dragPointerIdRef = useRef(null)
    const dragStartXRef = useRef(0)
    const dragStartAzimuthRef = useRef(0)
    const [azimuth, setAzimuth] = useState(INITIAL_AZIMUTH)
    const [isDragging, setIsDragging] = useState(false)
    const camera = useMemo(() => buildCameraFromAzimuth(azimuth), [azimuth])

    const { metric, Z, hoverTemplate, handleSurfaceClick, handleSurfaceHover, handleSurfaceUnhover } = useSurfaceGraph({
        data: safeData,
        activeMetric,
        setCoordinates,
    })
    const maxZ = useMemo(() => Math.max(0, ...Z.flat()), [Z])

    const handlePointerDown = useCallback((event) => {
        if (event.button !== 0) return

        const container = containerRef.current
        if (!container) return

        dragPointerIdRef.current = event.pointerId
        dragStartXRef.current = event.clientX
        dragStartAzimuthRef.current = azimuth
        setIsDragging(true)
        container.setPointerCapture(event.pointerId)
    }, [azimuth])

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

    return (
        <div
            ref={containerRef}
            className="surface-plot-3d"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
            {hasData && (
                <Plot
                    data={[{
                        type: "surface",
                        z: Z,
                        x: HOUR_LABELS,
                        y: DAY_LABELS,
                        colorscale: EDITORIAL_COLORSCALE,
                        showscale: false,
                        hovertemplate: hoverTemplate,
                    }]}
                    layout={{
                        paper_bgcolor: PAPER_RAISED,
                        plot_bgcolor: PAPER_RAISED,
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
                        hoverlabel: { font: { family: FONT_MONO } },
                    }}
                    onClick={handleSurfaceClick}
                    onHover={handleSurfaceHover}
                    onUnhover={handleSurfaceUnhover}
                    config={{
                        displayModeBar: false,
                        scrollZoom: false,
                        staticPlot: false,
                    }}
                    useResizeHandler
                    className="w-full h-full"
                />
            )}
            {(loading || error) && <StatusMessage loading={loading} error={error} onRefetch={onRefetch} />}
        </div>
    )
}

export default SurfaceGraph
