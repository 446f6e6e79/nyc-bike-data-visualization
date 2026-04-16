import { getMetricConfig } from "../utils/metric_formatter.jsx"
import { DAY_LABELS, HOUR_LABELS } from "../../../utils/config.jsx"
import BarChart from "./BarChart.jsx"
import StatusMessage from "../../../components/StatusMessage"

/**
 * Component for displaying the histograms that accompany the surface graph
 * @param {Object} hourData - The data for the hour of day histogram, used to display the distribution of the selected metric across different hours of the day.
 * @param {Object} dayData - The data for the day of week histogram, used to display the distribution of the selected metric across different days of the week.
 * @param {string} activeMetric - The currently selected metric key, used to determine which metric's data to display in the histograms.
 * @param {Object} coordinates - The coordinates of the currently hovered point on the surface graph, used to highlight the corresponding bars in the histograms.
 * @param {boolean} loading - Whether temporal data is loading.
 * @param {Error|null} error - Error state for temporal data fetch.
 * @param {Function} onRefetch - Callback to trigger a retry after error.
 * @returns
 */
export default function SurfaceHistograms({ dayData, hourData, activeMetric, coordinates, loading, error, onRefetch }) {
    const metric = getMetricConfig(activeMetric)
    const showOverlay = loading || error
    // Extracts the metric values for the selected metric from the day and hour data using the corresponding metric getter function, preparing the data for the histograms. The highlight variable is used to determine which bar to highlight based on the hovered coordinates from the surface graph.
    const metricDayData = dayData?.map(metric.get)
    const metricHourData = hourData?.map(metric.get)
    // Configuration for the two histogram cards, one for day of week and one for hour of day, including the data, labels, and which value to highlight based on the hovered coordinates from the surface graph
    const cards = [
        {
            label: "by day of week",
            data: metricDayData,
            labels: DAY_LABELS,
            highlight: coordinates?.day,
            xAxisTitle: "Day of Week",
            xLabelStep: 1,
        },
        {
            label: "by hour of day",
            data: metricHourData,
            labels: HOUR_LABELS,
            highlight: coordinates?.hour,
            xAxisTitle: "Hour of Day",
            xLabelStep: 3,
        },
    ]

    return (
        <div className={`surface-histograms-grid${showOverlay ? ' surface-histograms-grid--hidden' : ''}`}>
            {/*Iterate over the histogram cards and render each one */}
            {cards.map(({ label, data, labels, highlight, xAxisTitle, xLabelStep }) => (
                <div key={label} className="surface-histogram-card">
                    <p className="surface-histogram-card__eyebrow">
                        {metric.label} {label}
                    </p>

                    <div className="surface-histogram-chart">
                        <BarChart
                            data={data}
                            labels={labels}
                            format={metric.format}
                            highlight={highlight}
                            xAxisTitle={xAxisTitle}
                            yAxisTitle={metric.label}
                            unit={metric.unit}
                            xLabelStep={xLabelStep}
                        />
                    </div>

                    {showOverlay && <StatusMessage loading={loading} error={error} onRefetch={onRefetch} />}
                </div>
            ))}
        </div>
    )
}
