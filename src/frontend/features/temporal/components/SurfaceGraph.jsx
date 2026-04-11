import Plot from "react-plotly.js"
import { HOUR_LABELS, DAY_LABELS } from "../../../utils/config.jsx"
import useSurfaceGraph from "../hooks/useSurfaceGraph"
import {
    INK,
    INK_MUTED,
    PAPER,
    PAPER_RAISED,
    ACCENT,
    ACCENT_INK,
    RULE,
    RULE_STRONG,
    FONT_SANS,
    FONT_DISPLAY,
    FONT_MONO,
} from "../../../utils/editorialTokens.js"

// Sequential editorial ramp: paper (min) → accent-ink (max).
// Five stops map the full z range cleanly without muddying the midrange.
const EDITORIAL_COLORSCALE = [
    [0.00, PAPER],
    [0.25, "#b8c9ec"],
    [0.50, "#6387e5"],
    [0.75, ACCENT],
    [1.00, ACCENT_INK],
]

// Shared axis factory — every axis uses the same typography and rule tones,
// so x/y/z stay visually parallel even when their labels differ.
const editorialAxis = (title) => ({
    title: { text: title, font: { family: FONT_DISPLAY, color: INK, size: 14 } },
    tickfont: { family: FONT_MONO, color: INK_MUTED, size: 11 },
    gridcolor: RULE,
    backgroundcolor: PAPER_RAISED,
    showbackground: true,
    zerolinecolor: RULE_STRONG,
})

/**
 * Component for rendering the 3D surface graph that visualizes the selected metric across days of the week and hours of the day.
 * @param {Object} data - The day-hour statistics data used to build the surface graph, containing the metric values for each day-hour combination.
 * @param {string} activeMetric - The currently selected metric key, used to determine which metric's data to display on the surface graph.
 * @param {Function} setCoordinates - Function to update the coordinates state in the parent component when the user hovers over a point on the surface graph, allowing the corresponding histograms to highlight the relevant bars based on the hovered day and hour.
 * @returns
 */
function SurfaceGraph({ data, activeMetric, setCoordinates }) {
    if (!data || data.length === 0) return null
    const { metric, Z, hoverTemplate, handleSurfaceClick } = useSurfaceGraph({
        data,
        activeMetric,
        setCoordinates,
    })

    return (
        <div className="surface-plot-3d">
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
                        dragmode: false,
                        camera: {
                            eye: { x: 1.6, y: -1.6, z: 0.9 },
                            center: { x: 0, y: 0, z: -0.1 },
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
                    font: { family: FONT_SANS, color: INK, size: 12 },
                }}
                onClick={handleSurfaceClick}
                config={{
                    displayModeBar: false,
                    scrollZoom: false,
                    staticPlot: false,
                }}
                useResizeHandler
                className="w-full h-full"
            />
        </div>
    )
}

export default SurfaceGraph
