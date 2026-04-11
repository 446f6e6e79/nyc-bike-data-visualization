import { useRef, useEffect } from "react"
import { Chart } from "chart.js/auto"
import { formatTooltipLabel, formatYAxisTick } from "../utils/barchart.tsx"
import {
    INK,
    INK_MUTED,
    ACCENT,
    RULE,
    FONT_DISPLAY,
    FONT_MONO,
} from "../../../utils/editorialTokens.js"

const BAR_SOLID = ACCENT                      // Highlighted bar — full accent
const BAR_MUTED = "rgba(25, 83, 216, 0.18)"   // Muted background bars at 18% accent

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
    const canvasRef = useRef(null)
    const chartRef = useRef(null)
    const colors = labels.map(label => (label === highlight ? BAR_SOLID : BAR_MUTED))
    const tooltipLabelCallback = formatTooltipLabel.bind(null, format)
    const yAxisTickCallback = formatYAxisTick.bind(null, unit)

    useEffect(() => {
        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderRadius: 0,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: tooltipLabelCallback }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: Boolean(xAxisTitle),
                            text: xAxisTitle,
                            font: { family: FONT_DISPLAY, size: 13, weight: "500" },
                            color: INK,
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: false,
                            font: { family: FONT_MONO, size: 10 },
                            color: INK_MUTED,
                        },
                        grid: { display: false },
                        border: { display: false },
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: Boolean(yAxisTitle),
                            text: yAxisTitle,
                            font: { family: FONT_DISPLAY, size: 13, weight: "500" },
                            color: INK,
                        },
                        ticks: {
                            maxTicksLimit: 5,
                            callback: yAxisTickCallback,
                            font: { family: FONT_MONO, size: 10 },
                            color: INK_MUTED,
                        },
                        grid: { color: RULE },
                        border: { display: false },
                    }
                }
            }
        })

        return () => chartRef.current?.destroy()
    }, [data, labels, colors, tooltipLabelCallback, xAxisTitle, yAxisTitle, yAxisTickCallback])

    return <canvas ref={canvasRef} />
}
