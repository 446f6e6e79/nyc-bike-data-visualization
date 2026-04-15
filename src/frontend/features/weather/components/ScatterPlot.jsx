import { useEffect, useMemo, useRef } from "react"
import { Chart } from "chart.js/auto"
import { GROUPED_WEATHER_CODES } from "../utils/wmo_code_handler.jsx"
import { formatData } from "../utils/scatterplot.jsx"
import {
    INK,
    INK_MUTED,
    RULE,
    FONT_DISPLAY,
    FONT_MONO,
    PAPER_RAISED,
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
    const tooltipRef = useRef(null)
    const formattedData = useMemo(() => formatData(data), [data])

    const WEATHER_ICONS = {
        Clear: "☀",
        Cloudy: "☁",
        Foggy: "🌫",
        Drizzle: "🌦",
        Rain: "🌧",
        Snow: "❄",
        Showers: "🌦",
        Thunderstorm: "⛈",
    }

    const getWeatherIcon = (group) => WEATHER_ICONS[group] ?? "•"

    const getOrCreateTooltipElement = () => {
        let tooltipEl = tooltipRef.current
        if (!tooltipEl) {
            tooltipEl = document.createElement('div')
            tooltipEl.id = 'chartjs-tooltip'
            tooltipEl.style.cssText = `
                position: fixed;
                background: ${INK};
                border: 1px solid rgba(25, 83, 216, 0.3);
                border-radius: 0;
                pointer-events: none;
                padding: 12px 16px;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                color: ${PAPER_RAISED};
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                max-width: 280px;
                backdrop-filter: blur(4px);
            `
            document.body.appendChild(tooltipEl)
            tooltipRef.current = tooltipEl
        }
        return tooltipEl
    }

    const externalTooltipHandler = (context) => {
        const { chart, tooltip } = context
        const tooltipEl = getOrCreateTooltipElement()

        if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = 0
            return
        }

        if (tooltip.body) {
            const point = tooltip.dataPoints?.[0]?.raw
            if (point) {
                const weatherIcon = getWeatherIcon(point.weatherGroup)
                const html = `
                    <div style="margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(25, 83, 216, 0.3);">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; color: ${PAPER_RAISED}; font-family: ${FONT_MONO}; letter-spacing: 0.02em;">
                            <span style="font-size: 14px; line-height: 1;">${weatherIcon}</span>
                            <span>${point.weatherLabel}</span>
                        </div>
                        <div style="font-weight: 400; color: rgba(251, 248, 242, 0.6); font-size: 10px; font-family: ${FONT_MONO}; letter-spacing: 0.04em; margin-top: 2px; text-transform: uppercase;">
                            ${point.weatherGroup}
                        </div>
                    </div>
                    <div style="margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(25, 83, 216, 0.2);">
                        <div style="font-size: 9px; color: rgba(251, 248, 242, 0.5); font-family: ${FONT_MONO}; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                            Activity
                        </div>
                        <div style="margin-bottom: 4px; font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: ${PAPER_RAISED}; font-weight: 600;">${point.ridesPerHour.toFixed(0)}</span>
                            <span style="color: rgba(251, 248, 242, 0.7);">/h</span>
                        </div>
                        <div style="margin-bottom: 4px; font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: rgba(251, 248, 242, 0.7);">Total:</span>
                            <span style="color: ${PAPER_RAISED}; font-weight: 600; margin-left: 4px;">${point.totalRides.toLocaleString()}</span>
                        </div>
                        <div style="font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: rgba(251, 248, 242, 0.7);">Hours:</span>
                            <span style="color: ${PAPER_RAISED}; font-weight: 600; margin-left: 4px;">${point.hoursCount}</span>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 9px; color: rgba(251, 248, 242, 0.5); font-family: ${FONT_MONO}; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                            Trip Stats
                        </div>
                        <div style="margin-bottom: 4px; font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: rgba(251, 248, 242, 0.7);">Duration:</span>
                            <span style="color: ${PAPER_RAISED}; font-weight: 600; margin-left: 4px;">${point.avgDurationMin.toFixed(2)}m</span>
                        </div>
                        <div style="margin-bottom: 4px; font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: rgba(251, 248, 242, 0.7);">Distance:</span>
                            <span style="color: ${PAPER_RAISED}; font-weight: 600; margin-left: 4px;">${point.avgDistanceKm.toFixed(2)}km</span>
                        </div>
                        <div style="font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: rgba(251, 248, 242, 0.7);">Speed:</span>
                            <span style="color: ${PAPER_RAISED}; font-weight: 600; margin-left: 4px;">${point.avgSpeed.toFixed(2)}km/h</span>
                        </div>
                    </div>
                `
                tooltipEl.innerHTML = html
            }
        }

        const canvasRect = chart.canvas.getBoundingClientRect()
        tooltipEl.style.opacity = 1
        tooltipEl.style.left = canvasRect.left + tooltip.caretX + 'px'
        tooltipEl.style.top = canvasRect.top + tooltip.caretY - 20 + 'px'
    }

    useEffect(() => {
        if (!canvasRef.current) return
        chartRef.current?.destroy()

        const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true })
        if (!ctx) return

        chartRef.current = new Chart(ctx, {
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
                    pointHoverRadius: SCATTER_POINT_RADIUS,
                    pointStyle: 'circle',
                })),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            font: { family: FONT_MONO, size: 10 },
                            color: INK_MUTED,
                            boxWidth: 12,
                            boxHeight: 12,
                            padding: 20,
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
                        padding: 12,
                        caretPadding: 16,
                        enabled: false,
                        external: externalTooltipHandler,
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

        return () => {
            chartRef.current?.destroy()
            if (tooltipRef.current) {
                tooltipRef.current.remove()
                tooltipRef.current = null
            }
        }
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
