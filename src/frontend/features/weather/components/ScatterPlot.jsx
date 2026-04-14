import { useEffect, useRef, useMemo } from "react"
import { Chart } from "chart.js/auto"
import { GROUPED_WEATHER_CODES } from "../utils/wmo_code_handler.jsx"
import { formatData } from "../utils/scatterplot.jsx"
import {
    INK,
    INK_MUTED,
    RULE,
    FONT_DISPLAY,
    FONT_MONO,
} from "../../../utils/editorialTokens.js"
import { SCATTER_BORDER_COLOR, SCATTER_BORDER_WIDTH, SCATTER_POINT_RADIUS } from "../../../utils/styling"
import StatusMessage from "../../../components/StatusMessage"

/**
 * Component for rendering a scatter plot of weather data
 * @param {{ Array }} data - Scatter data
 * @param {boolean} loading - Whether weather data is loading
 * @param {Error|null} error - Fetch error for weather data
 * @param {Function} onRefetch - Callback to trigger a retry after error
 * @returns {JSX.Element} The rendered scatter plot
 */
export default function ScatterPlot({ data, loading, error, onRefetch }) {
    const canvasRef = useRef(null)
    const chartRef = useRef(null)
    const formattedData = useMemo(() => formatData(data), [data])

    useEffect(() => {
        if (!canvasRef.current) return
        chartRef.current?.destroy()

        chartRef.current = new Chart(canvasRef.current, {
            type: "scatter",
            data: {
                datasets: formattedData.map(point => ({
                    label: point.weatherGroup,
                    // y = rides per hour, x = average speed, color = weather group
                    data: [{ x: point.avgSpeed, y: point.ridesPerHour, ...point }],
                    backgroundColor: GROUPED_WEATHER_CODES[point.weatherGroup]?.[1],
                    borderColor: SCATTER_BORDER_COLOR,
                    borderWidth: SCATTER_BORDER_WIDTH,
                    pointRadius: SCATTER_POINT_RADIUS,
                })),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            font: { family: FONT_MONO, size: 10 },
                            color: INK_MUTED,
                            boxWidth: 12,
                            boxHeight: 12,
                            padding: 16,
                            // Deduplicate weather groups in the legend
                            filter: (item, chart) => {
                                const labels = chart.datasets.map(d => d.label)
                                return labels.indexOf(item.text) === item.datasetIndex
                            },
                        },
                        onClick: (e, item, legend) => {
                            const chart = legend.chart
                            const targetLabel = item.text
                            chart.data.datasets.forEach((ds, i) => {
                                if (ds.label === targetLabel) {
                                    const meta = chart.getDatasetMeta(i)
                                    meta.hidden = !meta.hidden
                                }
                            })
                            chart.update()
                        },
                    },
                    tooltip: {
                        callbacks: {
                            title: items => {
                                const point = items[0]?.raw
                                return `${point.weatherLabel} (${point.weatherGroup})`
                            },
                            label: ctx => {
                                const point = ctx.raw
                                return [
                                    `Total rides: ${point.totalRides.toLocaleString()}`,
                                    `Hour count: ${point.hoursCount}`,
                                    `Rides per hour: ${point.ridesPerHour.toFixed(0)}`,
                                    `Avg duration: ${point.avgDurationMin.toFixed(2)} min`,
                                    `Avg distance: ${point.avgDistanceKm.toFixed(2)} km`,
                                    `Avg speed: ${point.avgSpeed.toFixed(2)} km/h`,
                                ]
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Average Speed (km/h)",
                            font: { family: FONT_DISPLAY, size: 13, weight: "500" },
                            color: INK,
                        },
                        ticks: { font: { family: FONT_MONO, size: 10 }, color: INK_MUTED },
                        grid: { color: RULE },
                        border: { display: false },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Rides Per Hour",
                            font: { family: FONT_DISPLAY, size: 13, weight: "500" },
                            color: INK,
                        },
                        beginAtZero: true,
                        ticks: { font: { family: FONT_MONO, size: 10 }, color: INK_MUTED },
                        grid: { color: RULE },
                        border: { display: false },
                    },
                },
            },
        })

        return () => chartRef.current?.destroy()
    }, [formattedData])

    return (
        <div className="scatter-plot-frame">
            <canvas ref={canvasRef} />
            {(loading || error) && (
                <StatusMessage loading={loading} error={error} onRefetch={onRefetch} />
            )}
        </div>
    )
}
