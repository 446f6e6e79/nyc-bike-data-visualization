import { useMemo, useRef, useEffect } from "react"
import { Chart } from "chart.js/auto"
import { SURFACE_METRICS } from "../pages/SurfacePage.jsx"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const normalizeDay = d => (d === 0 ? 6 : d - 1)

const BAR_SOLID = "#3266ad"
const BAR_MUTED = "rgba(50,102,173,0.2)"

// ---------- helpers ----------
function getValue(d, metric) {
  switch (metric) {
    case "total_rides": return d.total_rides

    case "total_duration_minutes":
      return d.total_duration_seconds / 60

    case "average_duration_minutes":
      return d.average_duration_seconds / 60

    case "total_distance":
      return d.total_distance_km

    case "average_distance":
      return d.average_distance_km

    default: return 0
  }
}

function buildProjections(data, metric) {
    const isAvg = metric.startsWith("average")
    const dayAcc = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }))
    const hourAcc = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))

    data.forEach(d => {
        const day = normalizeDay(d.day_of_week)
        const val = getValue(d, metric)

        if (isAvg) {
            const weight = d.total_rides || 0
            dayAcc[day].sum += val * weight
            dayAcc[day].count += weight
            hourAcc[d.hour].sum += val * weight
            hourAcc[d.hour].count += weight
        } else {
            dayAcc[day].sum += val
            hourAcc[d.hour].sum += val
        }
    })

    return {
        dayData: isAvg
            ? dayAcc.map(x => (x.count ? x.sum / x.count : 0))
            : dayAcc.map(x => x.sum),

        hourData: isAvg
            ? hourAcc.map(x => (x.count ? x.sum / x.count : 0))
            : hourAcc.map(x => x.sum),
    }
}

// ---------- reusable chart ----------
function BarChart({ data, labels, format }) {
    const canvasRef = useRef(null)
    const chartRef = useRef(null)

    useEffect(() => {
        if (!canvasRef.current || !data?.length) return

        const max = Math.max(...data)
        const colors = data.map(v => (v === max ? BAR_SOLID : BAR_MUTED))

        if (chartRef.current) chartRef.current.destroy()

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderRadius: 3,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => " " + format(ctx.parsed.y)
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { maxRotation: 0, autoSkip: false },
                        grid: { display: false },
                        border: { display: false }
                    },
                    y: {
                        ticks: {
                            maxTicksLimit: 5,
                            callback: v => {
                                if (v >= 1e6) return (v / 1e6).toFixed(1) + "M"
                                if (v >= 1e3) return (v / 1e3).toFixed(0) + "k"
                                return v.toFixed(1)
                            }
                        },
                        grid: { color: "rgba(0,0,0,0.06)" },
                        border: { display: false }
                    }
                }
            }
        })

        return () => chartRef.current?.destroy()
    }, [data, labels, format])

    return <canvas ref={canvasRef} />
}

// ---------- main component ----------
export default function SurfaceHistograms({ data = [], activeMetric }) {
    console.log("DATA:", data)
    console.log("ACTIVE METRIC:", activeMetric)
    const metricDef =
        SURFACE_METRICS.find(m => m.key === activeMetric) ||
        SURFACE_METRICS[0]

    const { dayData, hourData } = useMemo(
        () => buildProjections(data, activeMetric),
        [data, activeMetric]
    )

    const isAvg = activeMetric.startsWith("average")

    const dayStat = isAvg
        ? metricDef.fmt(dayData.reduce((a, b) => a + b, 0) / 7)
        : metricDef.fmt(dayData.reduce((a, b) => a + b, 0))

    const hourStat = isAvg
        ? metricDef.fmt(hourData.reduce((a, b) => a + b, 0) / 24)
        : metricDef.fmt(hourData.reduce((a, b) => a + b, 0))

    const hourLabels = Array.from({ length: 24 }, (_, i) =>
        i % 6 === 0 ? `${i}h` : ""
    )

    const cards = [
        { label: "by day of week", stat: dayStat, data: dayData, labels: DAY_LABELS },
        { label: "by hour of day", stat: hourStat, data: hourData, labels: hourLabels }
    ]

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {cards.map(({ label, stat, data, labels }) => (
                <div
                    key={label}
                    style={{
                        background: "var(--color-background-primary)",
                        border: "0.5px solid var(--color-border-tertiary)",
                        borderRadius: "var(--border-radius-lg)",
                        padding: "1rem 1.25rem",
                    }}
                >
                    <p style={{
                        fontSize: 11,
                        color: "var(--color-text-tertiary)",
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        margin: "0 0 4px"
                    }}>
                        {label}
                    </p>

                    <p style={{
                        fontSize: 20,
                        fontWeight: 500,
                        margin: "0 0 1rem"
                    }}>
                        {stat}
                    </p>

                    <div style={{ height: 220 }}>
                        <BarChart
                            data={data}
                            labels={labels}
                            format={metricDef.fmt}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}