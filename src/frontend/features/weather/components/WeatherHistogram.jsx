import { useEffect, useMemo, useRef } from "react"
import { Chart } from "chart.js/auto"
import { formatData } from "../utils/scatterplot.jsx"
import { GROUPED_WEATHER_CODES } from "../utils/wmo_code_handler.jsx"
import {
    INK,
    INK_MUTED,
    RULE,
    FONT_DISPLAY,
    FONT_MONO,
} from "../../../utils/editorialTokens.js"
import StatusMessage from "../../../components/StatusMessage"

function aggregateByGroup(data) {
    const grouped = new Map()

    data.forEach((row) => {
        const current = grouped.get(row.weatherGroup) ?? {
            totalRides: 0,
            hoursCount: 0,
        }
        current.totalRides += row.totalRides
        current.hoursCount += row.hoursCount
        grouped.set(row.weatherGroup, current)
    })

    return Array.from(grouped.entries())
        .map(([group, values]) => {
            const ridesPerDay = values.hoursCount > 0
                ? values.totalRides / (values.hoursCount / 24)
                : 0

            return {
                group,
                ridesPerDay,
            }
        })
        .sort((a, b) => b.ridesPerDay - a.ridesPerDay)
}

export default function WeatherHistogram({ data, loading, error, onRefetch }) {
    const canvasRef = useRef(null)
    const chartRef = useRef(null)

    const groupedData = useMemo(() => aggregateByGroup(formatData(data || [])), [data])

    useEffect(() => {
        if (!canvasRef.current) return
        chartRef.current?.destroy()

        const labels = groupedData.map((item) => item.group)
        const values = groupedData.map((item) => item.ridesPerDay)
        const colors = groupedData.map((item) => GROUPED_WEATHER_CODES[item.group]?.[1] ?? "#6e6a62")

        const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true })
        if (!ctx) return

        chartRef.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Rides per day",
                        data: values,
                        backgroundColor: colors,
                        hoverBackgroundColor: colors,
                        borderColor: "rgba(11,12,14,0.3)",
                        hoverBorderColor: "rgba(11,12,14,0.3)",
                        borderWidth: 1,
                        hoverBorderWidth: 1,
                        borderRadius: 0,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        borderWidth: 0,
                        borderColor: "transparent",
                        callbacks: {
                            label: (ctx) => ` ${ctx.parsed.y.toFixed(1)} rides/day`,
                        },
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Weather Group",
                            font: { family: FONT_DISPLAY, size: 13, weight: "500" },
                            color: INK,
                        },
                        ticks: {
                            font: { family: FONT_MONO, size: 10 },
                            color: INK_MUTED,
                        },
                        grid: { display: false },
                        border: { display: false },
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Rides per Day",
                            font: { family: FONT_DISPLAY, size: 13, weight: "500" },
                            color: INK,
                        },
                        ticks: {
                            font: { family: FONT_MONO, size: 10 },
                            color: INK_MUTED,
                            callback: (value) => Number(value).toFixed(0),
                        },
                        grid: { color: RULE },
                        border: { display: false },
                    },
                },
            },
        })

        return () => chartRef.current?.destroy()
    }, [groupedData])

    return (
        <div className="weather-histogram-frame">
            <canvas ref={canvasRef} />
            {(loading || error) && (
                <StatusMessage loading={loading} error={error} onRefetch={onRefetch} />
            )}
        </div>
    )
}
