import { useRef, useEffect } from "react"
import { Chart } from "chart.js/auto"

const BAR_SOLID = "#3266ad" // A solid blue color for the highlighted bar in the chart
const BAR_MUTED = "rgba(50,102,173,0.2)" // A muted blue color with transparency for the non-highlighted bars in the chart, creating a visual contrast to emphasize the highlighted bar.

/**
 * Component for rendering a bar chart using Chart.js, with support for highlighting a specific bar based on the provided highlight value. 
 * @param {Array} data - The array of values to be displayed as bars in the chart.
 * @param {Array} labels - The array of labels corresponding to each bar in the chart.
 * @param {Function} format - A function to format the tooltip values when hovering over the bars.
 * @param {string} highlight - The label of the bar that should be highlighted, used to determine which bar gets the solid color and which ones get the muted color.
 * @returns A canvas element where the Chart.js bar chart will be rendered.
 */

export default function BarChart({
    data = [],
    labels = [],
    format,
    highlight = null,
    xAxisTitle,
    yAxisTitle,
    unit,
}) {
    // Refs to store the canvas element and the Chart.js instance, allowing us to create and destroy the chart as needed when the data or highlight changes.
    const canvasRef = useRef(null)
    const chartRef = useRef(null)
    const colors = labels.map(label => (label === highlight ? BAR_SOLID : BAR_MUTED))
    // Effect hook to create the Chart.js bar chart when the component mounts or when the data, labels, format
    useEffect(() => {
        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderRadius: 3,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,   // Make the chart responsive to container size changes
                maintainAspectRatio: false, // Allow the chart to fill the container without maintaining a fixed aspect ratio
                // Configuration for the chart's appearance
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: ctx => " " + format(ctx.parsed.y) }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: Boolean(xAxisTitle),
                            text: xAxisTitle,
                        },
                        ticks: { maxRotation: 0, autoSkip: false },
                        grid: { display: false },
                        border: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: Boolean(yAxisTitle),
                            text: yAxisTitle,
                        },
                        ticks: {
                            maxTicksLimit: 5,
                            callback: v => {
                                if (unit === "rides") {
                                    if (v >= 1e6) return (v / 1e6).toFixed(1) + "M"
                                    if (v >= 1e3) return (v / 1e3).toFixed(0) + "k"
                                    return Math.round(v).toLocaleString()
                                }
                                return Number(v).toFixed(1)
                            }
                        },
                        grid: { color: "rgba(0,0,0,0.06)" },
                        border: { display: false }
                    }
                }
            }
        })

        return () => chartRef.current?.destroy()
    }, [data, labels, colors, format, xAxisTitle, yAxisTitle, unit])

    return <canvas ref={canvasRef} />
}