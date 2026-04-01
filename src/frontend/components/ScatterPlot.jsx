
import { useEffect, useMemo, useRef } from "react"
import { Chart } from "chart.js/auto"

const DEFAULT_GROUP_COLORS = {
    Clear: "#1f77b4",
    Cloudy: "#4f6d7a",
    Foggy: "#7f8c8d",
    Drizzle: "#2a9d8f",
    Rain: "#0a9396",
    Snow: "#9b5de5",
    Showers: "#3a86ff",
    Thunderstorm: "#d62828",
    Other: "#6c757d",
}

function resolveWeatherGroup(weatherCode, weatherGroups) {
    const entries = Object.entries(weatherGroups || {})
    for (const [groupName, codes] of entries) {
        if (Array.isArray(codes) && codes.includes(weatherCode)) {
            return groupName
        }
    }
    return "Other"
}

export default function ScatterPlot({ data = [], weatherCodeLabels = {}, weatherGroups = {} }) {
    const canvasRef = useRef(null)
    const chartRef = useRef(null)

    const prepared = useMemo(() => {
        if (!Array.isArray(data)) return []

        return data
            .map(row => {
                const weatherCode = Number(row.weather_code)
                const totalRides = Number(row.total_rides ?? 0)
                const hoursCount = Number(row.hours_count ?? 0)
                const avgDurationMinutes = Number(row.average_duration_seconds ?? 0) / 60
                const avgDistanceKm = Number(row.average_distance_km ?? 0)
                const ridesPerHour = hoursCount > 0 ? totalRides / hoursCount : totalRides
                const weatherGroup = resolveWeatherGroup(weatherCode, weatherGroups)

                return {
                    x: avgDurationMinutes,
                    y: ridesPerHour,
                    weatherCode,
                    weatherLabel: weatherCodeLabels[weatherCode] ?? `Code ${weatherCode}`,
                    weatherGroup,
                    totalRides,
                    hoursCount,
                    avgDistanceKm,
                }
            })
            .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y) && point.weatherCode >= 0)
    }, [data, weatherCodeLabels, weatherGroups])

    const datasets = useMemo(() => {
        const groupedPoints = new Map()

        for (const point of prepared) {
            const key = point.weatherGroup
            if (!groupedPoints.has(key)) groupedPoints.set(key, [])
            groupedPoints.get(key).push(point)
        }

        return Array.from(groupedPoints.entries()).map(([groupName, points]) => ({
            label: groupName,
            data: points,
            backgroundColor: DEFAULT_GROUP_COLORS[groupName] ?? DEFAULT_GROUP_COLORS.Other,
            borderColor: "rgba(0, 0, 0, 0.2)",
            borderWidth: 1,
            pointRadius: ctx => {
                const rides = Number(ctx.raw?.totalRides ?? 0)
                return Math.max(4, Math.min(12, Math.sqrt(rides) / 5 + 3))
            },
            pointHoverRadius: ctx => {
                const rides = Number(ctx.raw?.totalRides ?? 0)
                return Math.max(6, Math.min(16, Math.sqrt(rides) / 4 + 4))
            },
        }))
    }, [prepared])

    useEffect(() => {
        if (!canvasRef.current) return

        chartRef.current?.destroy()

        chartRef.current = new Chart(canvasRef.current, {
            type: "scatter",
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                    },
                    tooltip: {
                        callbacks: {
                            title: items => {
                                const point = items[0]?.raw
                                return point ? `${point.weatherLabel} (${point.weatherGroup})` : ""
                            },
                            label: ctx => {
                                const point = ctx.raw
                                if (!point) return ""
                                return [
                                    `Avg duration: ${point.x.toFixed(2)} min`,
                                    `Rides/hour: ${point.y.toFixed(2)}`,
                                    `Total rides: ${point.totalRides.toLocaleString()}`,
                                    `Hours counted: ${point.hoursCount.toLocaleString()}`,
                                    `Avg distance: ${point.avgDistanceKm.toFixed(2)} km`,
                                ]
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Average Ride Duration (minutes)",
                        },
                        grid: { color: "rgba(0, 0, 0, 0.06)" },
                        border: { display: false },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Rides per Hour",
                        },
                        beginAtZero: true,
                        grid: { color: "rgba(0, 0, 0, 0.06)" },
                        border: { display: false },
                    },
                },
            },
        })

        return () => chartRef.current?.destroy()
    }, [datasets])

    if (!prepared.length) {
        return <p className="status-message">No weather statistics available for the selected filters.</p>
    }

    return (
        <div style={{ width: "100%", height: "520px" }}>
            <canvas ref={canvasRef} />
        </div>
    )
}