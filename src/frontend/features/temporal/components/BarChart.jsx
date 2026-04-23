import { useRef, useEffect } from "react"
import { Chart } from "chart.js/auto"
import { formatTooltipLabel, formatYAxisTick } from "../utils/barchart.tsx"
import {
    INK,
    INK_MUTED,
    RULE,
    FONT_DISPLAY,
    FONT_MONO,
} from "../../../utils/editorialTokens.js"
import { BAR_SOLID, BAR_MUTED } from "../../../utils/styling"

function toRgba(hexColor, alpha) {
    if (!hexColor?.startsWith("#") || (hexColor.length !== 7 && hexColor.length !== 4)) {
        return `rgba(25, 83, 216, ${alpha})`
    }

    const expanded = hexColor.length === 4
        ? `#${hexColor[1]}${hexColor[1]}${hexColor[2]}${hexColor[2]}${hexColor[3]}${hexColor[3]}`
        : hexColor

    const red = Number.parseInt(expanded.slice(1, 3), 16)
    const green = Number.parseInt(expanded.slice(3, 5), 16)
    const blue = Number.parseInt(expanded.slice(5, 7), 16)

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function buildHighlightColors(labels, highlight, solidColor, mutedColor) {
    if (!highlight) return labels.map(() => solidColor)
    return labels.map((label) => (label === highlight ? solidColor : mutedColor))
}


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
    xLabelStep = 1,
    compareDatasets = null,
}) {
    const canvasRef = useRef(null)
    const chartRef = useRef(null)
    const hasCompareDatasets = Array.isArray(compareDatasets) && compareDatasets.length > 0
    const colors = buildHighlightColors(labels, highlight, BAR_SOLID, BAR_MUTED)
    const isHourChart = xAxisTitle === "Hour of Day"
    const isDayChart = xAxisTitle === "Day of Week"
    const tooltipLabelCallback = (ctx) => {
        const valueLabel = formatTooltipLabel(format, ctx)
        if (!hasCompareDatasets) return `Rhythm: ${valueLabel.trim()}`
        return `${ctx.dataset.label} \u00b7 Rhythm: ${valueLabel.trim()}`
    }
    const tooltipTitleCallback = (items) => {
        if (!items?.length) return ""
        const hourLabel = String(items?.[0]?.label ?? "")
        if (!isHourChart) return `Moment: ${hourLabel}`
        return `Moment: Hour ${hourLabel.padStart(2, "0")}`
    }
    const tooltipAfterTitleCallback = (items) => {
        if (!isDayChart) return ""
        const dayLabel = String(items?.[0]?.label ?? "")
        return `Story Day: ${dayLabel}`
    }
    const yAxisTickCallback = formatYAxisTick.bind(null, unit)

    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true })
        if (!ctx) return

        const datasets = hasCompareDatasets
            ? compareDatasets.map((dataset, index) => {
                const baseColor = dataset.color ?? BAR_SOLID
                const emphasized = toRgba(baseColor, 0.86)
                const softened = toRgba(baseColor, 0.32)

                return {
                    label: dataset.label,
                    data: dataset.data,
                    backgroundColor: buildHighlightColors(labels, highlight, emphasized, softened),
                    borderColor: toRgba(baseColor, 0.95),
                    borderWidth: 1,
                    borderRadius: 0,
                    borderSkipped: false,
                    barPercentage: 0.86,
                    categoryPercentage: 0.7,
                    order: index,
                }
            })
            : [{
                data,
                backgroundColor: colors,
                borderRadius: 0,
                borderSkipped: false,
            }]

        chartRef.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets,
            },
            options: {
                animation: {
                    duration: 440,
                    easing: "easeOutQuart",
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: hasCompareDatasets,
                        position: "top",
                        labels: {
                            boxWidth: 10,
                            boxHeight: 10,
                            useBorderRadius: false,
                            font: { family: FONT_MONO, size: 10 },
                            color: INK_MUTED,
                        },
                    },
                    tooltip: {
                        padding: { top: 12, right: 14, bottom: 12, left: 14 },
                        displayColors: hasCompareDatasets,
                        usePointStyle: true,
                        borderRadius: 0,
                        titleSpacing: 4,
                        bodySpacing: 5,
                        callbacks: {
                            title: tooltipTitleCallback,
                            label: tooltipLabelCallback,
                        }
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
                            callback: (value, index) => (index % xLabelStep === 0 ? labels[index] : ''),
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
    }, [
        data,
        labels,
        colors,
        compareDatasets,
        hasCompareDatasets,
        highlight,
        isHourChart,
        isDayChart,
        tooltipLabelCallback,
        xAxisTitle,
        yAxisTitle,
        yAxisTickCallback,
        xLabelStep,
    ])

    return <canvas ref={canvasRef} />
}
