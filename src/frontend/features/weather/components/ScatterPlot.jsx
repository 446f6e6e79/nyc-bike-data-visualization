
import { useEffect, useRef, useMemo } from "react"
import { Chart } from "chart.js/auto"
import { GROUPED_WEATHER_CODES } from "../utils/wmo_code_handler.jsx"
import { formatData } from "../utils/scatterplot.jsx"

/**
 * Component for rendering a scatter plot of weather data
 * @param {{ Array }} data - The props for the component
 * @returns {JSX.Element} The rendered scatter plot
 */
//#TODO: Fix this style to move it to a hook if remains like this
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
                    // y = rides per hour, x = average speed, point size = total rides, color = weather group
                    data: [{ x: point.avgSpeed, y: point.ridesPerHour, ...point }],
                    backgroundColor: GROUPED_WEATHER_CODES[point.weatherGroup]?.[1],
                    borderColor: "rgba(0, 0, 0, 0.5)",
                    borderWidth: 1,
                    pointRadius: 10,
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
                scales: {   // Configure x and y axes with titles and grid lines
                    x: {
                        title: { display: true, text: "Average Speed (km/h)" },
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