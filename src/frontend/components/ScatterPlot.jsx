
import { useEffect, useRef, useMemo } from "react"
import { Chart } from "chart.js/auto"
import { WMO_WEATHER_CODES, GROUPED_WEATHER_CODES, getWeatherGroup } from "../pages/WeatherPage.jsx"
import { METRIC_GETTERS } from "../pages/SurfacePage.jsx"

// Function to determine the radius of each point in the scatter plot based on the total number of rides
const pointRadius = rides => Math.max(4, Math.min(12, Math.sqrt(rides) / 5 + 3))

/**
 * Formats the weather data for use in the scatter plot
 * @param {Array} data - The raw weather data
 * @returns {Array} The formatted data with additional metrics and weather group information for each data point
 */
function formatData(data) {
    return data.map(d => {
        const code = d.weather_code
        const weatherGroup = getWeatherGroup(code)
        const weatherLabel = WMO_WEATHER_CODES[code]
        const hoursCount = d.hours_count
        return {
            totalRides: METRIC_GETTERS.total_rides(d),
            avgDistanceKm: METRIC_GETTERS.average_distance(d),
            avgDurationMin: METRIC_GETTERS.average_duration_minutes(d),
            ridesPerHour: METRIC_GETTERS.total_rides(d) / hoursCount,  // Add any additional metrics you want to show in the tooltip here
            weatherGroup,
            weatherLabel,
        }
    })
}

/**
 * Component for rendering a scatter plot of weather data
 * @param {{ Array }} data - The props for the component
 * @returns {JSX.Element} The rendered scatter plot
 */
export default function ScatterPlot({ data }) {
    // Refs to store the canvas element and the Chart.js instance
    const canvasRef = useRef(null)
    const chartRef = useRef(null)
    // Memoize the formatted data to avoid unnecessary re-computation on every render
    const formattedData = useMemo(() => formatData(data), [data])

    useEffect(() => {
        // Ensure the canvas element is available before trying to create the chart
        if (!canvasRef.current) return
        chartRef.current?.destroy()
        // Create a new Chart.js scatter plot with the formatted data
        chartRef.current = new Chart(canvasRef.current, {
            type: "scatter",
            data: {
                datasets: formattedData.map(point => ({
                    label: point.weatherGroup,
                    // x = rides per hour, y = average duration, point size = total rides, color = weather group
                    data: [{ x: point.avgDurationMin, y: point.ridesPerHour, ...point }],
                    backgroundColor: GROUPED_WEATHER_CODES[point.weatherGroup]?.[1],
                    borderColor: "rgba(0, 0, 0, 0.5)",
                    borderWidth: 1,
                    pointRadius: pointRadius(point.totalRides),
                })),
            },
            options: {
                responsive: true,   // Make the chart responsive to container size changes
                maintainAspectRatio: false, // Allow the chart to fill the container without maintaining a fixed aspect ratio
                plugins: {
                    // Configure the legend to show weather groups color-coded
                    legend: {
                        position: "bottom",
                        labels: {
                            filter: (item, chart) => {
                                const labels = chart.datasets.map(d => d.label)
                                return labels.indexOf(item.text) === item.datasetIndex
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: items => {   // Show weather condition as tooltip title
                                const point = items[0]?.raw
                                return `${point.weatherLabel} (${point.weatherGroup})`
                            },
                            label: ctx => {// Show total rides, average duration, and average distance in tooltip body
                                const point = ctx.raw
                                return [
                                    `Total rides: ${point.totalRides.toLocaleString()}`,
                                    `Avg duration: ${point.avgDurationMin.toFixed(2)} min`,
                                    `Avg distance: ${point.avgDistanceKm.toFixed(2)} km`,
                                ]
                            },
                        },
                    },
                },
                scales: {   // Configure x and y axes with titles and grid lines
                    x: {
                        title: { display: true, text: "Average Ride Duration (minutes)" },
                        grid: { color: "rgba(0, 0, 0, 0.06)" },
                        border: { display: false },
                    },
                    y: {
                        title: { display: true, text: "Rides Per Hour" },
                        beginAtZero: true,
                        grid: { color: "rgba(0, 0, 0, 0.06)" },
                        border: { display: false },
                    },
                },
            },
        })
        // Cleanup function to destroy the chart instance when the component unmounts or before re-creating it on data change
        return () => chartRef.current?.destroy()
    }, [formattedData])
    // Render a canvas element wrapped in a div with fixed height to contain the scatter plot
    return (
        <div style={{ width: "100%", height: "520px" }}>
            <canvas ref={canvasRef} />
        </div>
    )
}