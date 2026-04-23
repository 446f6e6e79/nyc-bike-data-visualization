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
                background: linear-gradient(165deg, rgba(17, 18, 20, 0.97) 0%, rgba(11, 12, 14, 0.95) 100%);
                border: 1px solid rgba(25, 83, 216, 0.64);
                border-radius: 0;
                pointer-events: none;
                padding: 14px 16px;
                font-family: ${FONT_MONO};
                font-size: 11px;
                color: ${PAPER_RAISED};
                box-shadow: 0 12px 26px rgba(0, 0, 0, 0.34);
                z-index: 9999;
                max-width: 280px;
                backdrop-filter: blur(8px);
                transition: opacity 120ms ease, left 100ms ease, top 100ms ease;
                overflow: visible;
            `

            const contentEl = document.createElement('div')
            contentEl.setAttribute('data-tooltip-content', 'true')
            contentEl.style.position = 'relative'
            contentEl.style.zIndex = '2'

            const arrowEl = document.createElement('div')
            arrowEl.setAttribute('data-tooltip-arrow', 'true')
            arrowEl.style.position = 'absolute'
            arrowEl.style.width = '0'
            arrowEl.style.height = '0'
            arrowEl.style.borderTop = '6px solid transparent'
            arrowEl.style.borderBottom = '6px solid transparent'
            arrowEl.style.left = '-7px'
            arrowEl.style.borderRight = `7px solid ${INK}`
            arrowEl.style.zIndex = '1'

            tooltipEl.appendChild(contentEl)
            tooltipEl.appendChild(arrowEl)
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
                    <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(25, 83, 216, 0.38);">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; color: ${PAPER_RAISED}; font-family: ${FONT_MONO}; letter-spacing: 0.02em;">
                            <span style="font-size: 14px; line-height: 1;">${weatherIcon}</span>
                            <span>${point.weatherLabel}</span>
                        </div>
                        <div style="font-weight: 400; color: rgba(251, 248, 242, 0.6); font-size: 10px; font-family: ${FONT_MONO}; letter-spacing: 0.04em; margin-top: 2px; text-transform: uppercase;">
                            ${point.weatherGroup}
                        </div>
                    </div>
                    <div style="margin-bottom: 12px; padding: 8px 10px; border: 1px solid rgba(25, 83, 216, 0.28); background: rgba(25, 83, 216, 0.07);">
                        <div style="font-size: 9px; color: rgba(251, 248, 242, 0.5); font-family: ${FONT_MONO}; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                            Tempo
                        </div>
                        <div style="margin-bottom: 4px; font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: ${PAPER_RAISED}; font-weight: 600;">${point.ridesPerHour.toFixed(0)}</span><span style="color: rgba(251, 248, 242, 0.7);">/h</span>
                        </div>
                        <div style="margin-bottom: 4px; font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: rgba(251, 248, 242, 0.7);">Story volume:</span>
                            <span style="color: ${PAPER_RAISED}; font-weight: 600; margin-left: 4px;">${point.totalRides.toLocaleString()}</span>
                        </div>
                        <div style="font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: rgba(251, 248, 242, 0.7);">Observed hours:</span>
                            <span style="color: ${PAPER_RAISED}; font-weight: 600; margin-left: 4px;">${point.hoursCount}</span>
                        </div>
                    </div>
                    <div style="padding: 8px 10px; border: 1px solid rgba(25, 83, 216, 0.22);">
                        <div style="font-size: 9px; color: rgba(251, 248, 242, 0.5); font-family: ${FONT_MONO}; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                            Journey feel
                        </div>
                        <div style="margin-bottom: 4px; font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: rgba(251, 248, 242, 0.7);">Typical duration:</span>
                            <span style="color: ${PAPER_RAISED}; font-weight: 600; margin-left: 4px;">${point.avgDurationMin.toFixed(2)}m</span>
                        </div>
                        <div style="margin-bottom: 4px; font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: rgba(251, 248, 242, 0.7);">Typical distance:</span>
                            <span style="color: ${PAPER_RAISED}; font-weight: 600; margin-left: 4px;">${point.avgDistanceKm.toFixed(2)}km</span>
                        </div>
                        <div style="font-family: ${FONT_MONO}; font-size: 11px;">
                            <span style="color: rgba(251, 248, 242, 0.7);">Typical speed:</span>
                            <span style="color: ${PAPER_RAISED}; font-weight: 600; margin-left: 4px;">${point.avgSpeed.toFixed(2)}km/h</span>
                        </div>
                    </div>
                `
                const contentEl = tooltipEl.querySelector('[data-tooltip-content="true"]')
                if (contentEl) {
                    contentEl.innerHTML = html
                }
            }
        }

        const TOOLTIP_OFFSET_X = 34
        const TOOLTIP_OFFSET_Y = -26
        const VIEWPORT_MARGIN = 12
        const canvasRect = chart.canvas.getBoundingClientRect()
        const pointX = canvasRect.left + tooltip.caretX
        const pointY = canvasRect.top + tooltip.caretY
        const tooltipWidth = tooltipEl.offsetWidth
        const tooltipHeight = tooltipEl.offsetHeight

        const canPlaceRight = pointX + TOOLTIP_OFFSET_X + tooltipWidth <= window.innerWidth - VIEWPORT_MARGIN
        const isRightSide = canPlaceRight
        const baseLeft = isRightSide
            ? pointX + TOOLTIP_OFFSET_X
            : pointX - TOOLTIP_OFFSET_X - tooltipWidth
        const baseTop = pointY + TOOLTIP_OFFSET_Y

        const maxLeft = window.innerWidth - tooltipEl.offsetWidth - VIEWPORT_MARGIN
        const maxTop = window.innerHeight - tooltipEl.offsetHeight - VIEWPORT_MARGIN

        const nextLeft = Math.min(Math.max(baseLeft, VIEWPORT_MARGIN), Math.max(maxLeft, VIEWPORT_MARGIN))
        const nextTop = Math.min(Math.max(baseTop, VIEWPORT_MARGIN), Math.max(maxTop, VIEWPORT_MARGIN))

        const arrowEl = tooltipEl.querySelector('[data-tooltip-arrow="true"]')
        if (arrowEl) {
            const arrowTop = Math.min(Math.max(pointY - nextTop - 6, 8), Math.max(tooltipHeight - 14, 8))
            arrowEl.style.top = `${arrowTop}px`

            if (isRightSide) {
                arrowEl.style.left = '-7px'
                arrowEl.style.right = 'auto'
                arrowEl.style.borderRight = '7px solid rgba(11, 12, 14, 0.95)'
                arrowEl.style.borderLeft = 'none'
            } else {
                arrowEl.style.left = 'auto'
                arrowEl.style.right = '-7px'
                arrowEl.style.borderLeft = '7px solid rgba(11, 12, 14, 0.95)'
                arrowEl.style.borderRight = 'none'
            }
        }

        tooltipEl.style.opacity = 1
        tooltipEl.style.left = nextLeft + 'px'
        tooltipEl.style.top = nextTop + 'px'
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
                    pointHoverRadius: SCATTER_POINT_RADIUS * 1.5,
                    pointStyle: 'circle',
                })),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 420,
                    easing: "easeOutQuart",
                },
                animations: {
                    radius: {
                        duration: 520,
                        easing: "easeOutQuart",
                    },
                },
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
                        ticks: {
                            font: { family: FONT_MONO, size: 10 },
                            color: INK_MUTED,
                            callback: value => Number(value).toFixed(0),
                        },
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
