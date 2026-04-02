import { METRIC_LABELS, METRIC_GETTERS, METRIC_FORMATS, METRIC_UNITS } from "../../pages/SurfacePage.jsx"
import { DAY_LABELS, HOUR_LABELS } from "../../config.jsx"
import BarChart from "../BarChart.jsx"

/**
 * Component for displaying the histograms that accompany the surface graph
 * @param {Object} hourData - The data for the hour of day histogram, used to display the distribution of the selected metric across different hours of the day.
 * @param {Object} dayData - The data for the day of week histogram, used to display the distribution of the selected metric across different days of the week.
 * @param {string} activeMetric - The currently selected metric key, used to determine which metric's data to display in the histograms.
 * @param {Object} coordinates - The coordinates of the currently hovered point on the surface graph, used to highlight the corresponding bars in the histograms. 
 * @returns 
 */
export default function SurfaceHistograms({ dayData, hourData, activeMetric, coordinates }) {
    // Extracts the metric values for the selected metric from the day and hour data using the corresponding metric getter function, preparing the data for the histograms. The highlight variable is used to determine which bar to highlight based on the hovered coordinates from the surface graph.
    const metricDayData = dayData?.map(METRIC_GETTERS[activeMetric])
    const metricHourData = hourData?.map(METRIC_GETTERS[activeMetric])
    // Configuration for the two histogram cards, one for day of week and one for hour of day, including the data, labels, and which value to highlight based on the hovered coordinates from the surface graph
    const cards = [
        {
            label: "by day of week",
            data: metricDayData,
            labels: DAY_LABELS,
            highlight: coordinates?.day,
            xAxisTitle: "Day of Week",
        },
        {
            label: "by hour of day",
            data: metricHourData,
            labels: HOUR_LABELS,
            highlight: coordinates?.hour,
            xAxisTitle: "Hour of Day",
        },
    ]

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/*Iterate over the histogram cards and render each one */}
            {cards.map(({ label, data, labels, highlight, xAxisTitle }) => (
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
                        <BarChart
                            data={data}
                            labels={labels}
                            format={METRIC_FORMATS[activeMetric]}
                            highlight={highlight}
                            xAxisTitle={xAxisTitle}
                            yAxisTitle={METRIC_LABELS[activeMetric]}
                            unit={METRIC_UNITS[activeMetric]}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}