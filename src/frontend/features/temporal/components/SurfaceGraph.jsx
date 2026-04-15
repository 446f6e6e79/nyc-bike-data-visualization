import Plot from "react-plotly.js"
import { HOUR_LABELS, DAY_LABELS } from "../../../utils/config.jsx"
import useSurfaceGraph from "../hooks/useSurfaceGraph"
import StatusMessage from "../../../components/StatusMessage"
import { PAPER_RAISED, FONT_MONO, INK } from "../../../utils/editorialTokens.js"
import { EDITORIAL_COLORSCALE, editorialAxis } from "../../../utils/styling"

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

    const { metric, Z, hoverTemplate, handleSurfaceClick, handleSurfaceHover, handleSurfaceUnhover } = useSurfaceGraph({
        data: safeData,
        activeMetric,
        setCoordinates,
    })

    return (
        <div className="surface-plot-3d">
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
                            // Disable user-driven rotation/zoom to keep the editorial framing consistent
                            dragmode: "turntable",
                            camera: {
                                eye: { x: 1.6, y: -1.6, z: 0.9 },
                                center: { x: 0, y: 0, z: -0.3 },
                                up: { x: 0, y: 0, z: 1 },
                                projection: { type: "perspective" },
                            },
                            xaxis: editorialAxis("Hour of Day"),
                            yaxis: editorialAxis("Day of Week"),
                            zaxis: editorialAxis(metric.label),
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
