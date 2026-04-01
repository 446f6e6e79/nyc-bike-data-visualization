import Plot from "react-plotly.js"
import { useMemo } from "react"
import { HOUR_LABELS, DAY_LABELS, normalizeDay } from "../../config.jsx"
import { METRIC_LABELS, METRIC_GETTERS, METRIC_FORMATS } from "../../pages/SurfacePage.jsx"

const BLUE_COLORSCALE = [
    [0.0, "#deedf8"],
    [0.2, "#b0d4ee"],
    [0.4, "#6aaad8"],
    [0.6, "#2e7fbf"],
    [0.75, "#1a5e9a"],
    [0.85, "#124278"],
    [0.92, "#0c2e58"],
    [1.0, "#071d3a"],
]

/**
 * Component for rendering the 3D surface graph that visualizes the selected metric across days of the week and hours of the day. 
 * @param {Object} data - The day-hour statistics data used to build the surface graph, containing the metric values for each day-hour combination.
 * @param {string} activeMetric - The currently selected metric key, used to determine which metric's data to display on the surface graph.
 * @param {Function} setCoordinates - Function to update the coordinates state in the parent component when the user hovers over a point on the surface graph, allowing the corresponding histograms to highlight the relevant bars based on the hovered day and hour.
 * @returns 
 */
function SurfaceGraph({ data, activeMetric, setCoordinates }) {
    // If no data is available, return null to avoid rendering the graph
    if (!data || data.length === 0) return null
    // Preprocesses the input data to create a 2D array (Z matrix) that represents the metric values for each combination of day and hour, which will be used as the Z values for the surface graph. The useMemo hook is used to optimize performance by memoizing the computed Z matrix, so it only recalculates when the input data or active metric changes.
    const Z = useMemo(() => {
        // Formats the data
        const metric = METRIC_GETTERS[activeMetric]
        // Initializes a 7x24 grid to hold the metric values for each day-hour combination
        const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
        // Populates the grid
        for (let i = 0; i < data.length; i++) {
            const d = data[i]
            const day = normalizeDay(d.day_of_week)
            grid[day][d.hour] = metric(d)
        }
        return grid
    }, [data, activeMetric])

    // Prepares the text for the hover tooltips by formatting the Z values using the appropriate metric formatter, allowing the tooltips to display human-readable values when hovering over the surface graph.
    const hoverText = useMemo(() => {
        const formatMetric = METRIC_FORMATS[activeMetric]
        return Z.map(row => row.map(value => formatMetric(value)))
    }, [Z, activeMetric])

    return (
        <Plot
            data={[{
                type: "surface",
                z: Z,
                x: HOUR_LABELS,
                y: DAY_LABELS,
                text: hoverText,
                colorscale: BLUE_COLORSCALE,
                showscale: false,
                hovertemplate:
                    "<b>%{y}</b><br>" +
                    "Hour: %{x}<br>" +
                    `${METRIC_LABELS[activeMetric]}: <b>%{text}</b><extra></extra>`,
            }]}
            layout={{
                paper_bgcolor: "#ffffff",
                plot_bgcolor: "#ffffff",
                scene: {
                    // Disables user interactions like zooming and rotating the 3D surface to maintain a consistent view
                    dragmode: false,
                    // Camera position
                    camera: {
                        eye: { x: 1.6, y: -1.6, z: 0.9 },
                        center: { x: 0, y: 0, z: -0.1 },
                        up: { x: 0, y: 0, z: 1 },
                        projection: { type: "perspective" },
                    },
                    xaxis: {
                        title: { text: "Hour of Day", font: { color: "#000000", size: 16 } },
                        tickfont: { color: "#000000", size: 12 },
                        gridcolor: "#c0d8ef",
                        backgroundcolor: "#eaf3fb",
                        showbackground: true,
                        zerolinecolor: "#99c4e8",
                    },
                    yaxis: {
                        title: { text: "Day of Week", font: { color: "#000000", size: 16 } },
                        tickfont: { color: "#000000", size: 12 },
                        gridcolor: "#c0d8ef",
                        backgroundcolor: "#eaf3fb",
                        showbackground: true,
                        zerolinecolor: "#99c4e8",
                    },
                    zaxis: {
                        title: { text: METRIC_LABELS[activeMetric], font: { color: "#000000", size: 16 } },
                        tickfont: { color: "#000000", size: 12 },
                        gridcolor: "#c0d8ef",
                        backgroundcolor: "#f4f9fd",
                        showbackground: true,
                        zerolinecolor: "#99c4e8",
                    },
                    bgcolor: "#ffffff",
                    aspectmode: "manual",
                    aspectratio: { x: 1.8, y: 1, z: 0.7 },
                },
                margin: { l: 0, r: 0, b: 0, t: 20 },
                font: { family: "'DM Mono', monospace", color: "#000000" },
            }}
            // Event handler for when the user hovers over a point
            onClick={(eventData) => {
                const point = eventData.points[0]
                setCoordinates({
                    day: point.y,
                    hour: point.x,
                    value: point.z,
                })
            }}
            // Disables the mode bar and other interactive features to maintain a clean and static visualization
            config={{
                displayModeBar: false,
                scrollZoom: false,
                staticPlot: false,
            }}
            // Sets the style of the plot
            style={{ width: "100%", height: "600px" }}
        />
    )
}

export default SurfaceGraph