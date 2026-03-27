import { METRIC_LABELS, METRIC_GETTERS, METRIC_FORMATS } from "../../pages/SurfacePage.jsx"
import { DAY_LABELS, HOUR_LABELS, normalizeDay } from "../../config.jsx"
import BarChart from "../BarChart.jsx"

// Helper function to build the day and hour projections for the histograms based on the selected metric. 
function buildProjections(data, metric) {
    const getter = METRIC_GETTERS[metric]
    const dayAcc = Array(7).fill(0)
    const hourAcc = Array(24).fill(0)
    data.forEach(d => {
        dayAcc[normalizeDay(d.day_of_week)] += getter(d)
        hourAcc[d.hour] += getter(d)
    })
    return { dayData: dayAcc, hourData: hourAcc }
}

/**
 * Component for displaying the histograms that accompany the surface graph
 * @param {Object} data - The day-hour statistics data used to build the histograms.
 * @param {string} activeMetric - The currently selected metric key, used to determine which metric's data to display in the histograms.
 * @param {Object} coordinates - The coordinates of the currently hovered point on the surface graph, used to highlight the corresponding bars in the histograms. 
 * @returns 
 */
export default function SurfaceHistograms({ data, activeMetric, coordinates }) {
    // Builds the projections
    const { dayData, hourData } = buildProjections(data, activeMetric)
    // Configuration for the two histogram cards, one for day of week and one for hour of day, including the data, labels, and which value to highlight based on the hovered coordinates from the surface graph
    const cards = [
        { label: "by day of week", data: dayData, labels: DAY_LABELS, highlight: coordinates?.day },
        { label: "by hour of day", data: hourData, labels: HOUR_LABELS, highlight: coordinates?.hour },
    ]

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/*Iterate over the histogram cards and render each one */}
            {cards.map(({ label, data, labels, highlight }) => (
                <div
                    key={label}
                    style={{
                        background: "var(--color-background-primary)",
                        border: "0.5px solid var(--color-border-tertiary)",
                        borderRadius: "var(--border-radius-lg)",
                        padding: "1rem 1.25rem",
                    }}
                >
                    <p style={{
                        fontSize: 11,
                        color: "var(--color-text-tertiary)",
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        margin: "0 0 4px"
                    }}>
                        {METRIC_LABELS[activeMetric]} {label}
                    </p>

                    <div style={{ height: 220 }}>
                        <BarChart data={data} labels={labels} format={METRIC_FORMATS[activeMetric]} highlight={highlight} />
                    </div>
                </div>
            ))}
        </div>
    )
}