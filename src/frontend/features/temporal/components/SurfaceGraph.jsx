import Plot from "react-plotly.js"
import { HOUR_LABELS, DAY_LABELS } from "../../../utils/config.jsx"
import useSurfaceGraph from "../hooks/useSurfaceGraph"

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
    const { metric, Z, hoverText, handleSurfaceClick } = useSurfaceGraph({
        data,
        activeMetric,
        setCoordinates,
    })

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
                    `${metric.label}: <b>%{text}</b><extra></extra>`,
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
                        title: { text: metric.label, font: { color: "#000000", size: 16 } },
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
            // Event handler for when the user clicks over a point
            onClick={handleSurfaceClick}
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