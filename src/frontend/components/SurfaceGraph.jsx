import Plot from "react-plotly.js"

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function SurfaceGraph({ data, metric }) {
    console.log("SurfaceGraph metric:", metric)
    if (!data || data.length === 0) {
        return <p>No data available</p>
    }

    // data uses 0=Sun, 1=Mon … 6=Sat → remap to 0=Mon … 6=Sun
    const normalizeDay = (d) => (d === 0 ? 6 : d - 1)

    // Build a valueMap keyed by "normalizedDay-hour"
    const valueMap = new Map()
    data.forEach(d => {
        const day = normalizeDay(d.day_of_week)
        const key = `${day}-${d.hour}`

        let value = 0
        switch (metric) {
            case "total_rides":           value = d.total_rides;                      break
            case "total_duration_minutes": value = d.total_duration_seconds / 60;     break
            case "average_duration_minutes": value = d.average_duration_seconds / 60; break
            case "total_distance":        value = d.total_distance_km;                break
            case "average_distance":      value = d.average_distance_km;              break
        }

        valueMap.set(key, value)
    })

    // Build the 7×24 Z matrix — rows = days (0–6), cols = hours (0–23)
    const Z = DAY_LABELS.map((_, day) =>
        HOURS.map(hour => valueMap.get(`${day}-${hour}`) ?? 0)
    )

    return (
        <Plot
            data={[{
                type: "surface",
                z: Z,
                x: HOURS,
                y: DAY_LABELS,
                colorscale: "Viridis",
            }]}
            layout={{
                title: metric,
                scene: {
                    xaxis: { title: "Hour" },
                    yaxis: { title: "Day" },
                    zaxis: { title: metric },
                    camera: {
                        eye: { x: 1.5, y: 1.5, z: 0.8 },
                    },
                },
                margin: { l: 0, r: 0, b: 0, t: 40 },
            }}
            config={{
                staticPlot: false,   // was true — surface needs interaction to rotate
                displayModeBar: false,
            }}
            style={{ width: "100%", height: "600px" }}
        />
    )
}

export default SurfaceGraph