import { scaleBand, scaleLinear, max } from 'd3'

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function DailyStatsBarChart({ items }) {
  const width = 860
  const height = 320
  const margin = { top: 16, right: 20, bottom: 56, left: 56 }

  const normalized = DAY_ORDER.map((day, index) => {
    const entry = items.find(item => item.day_of_week === index)
    return {
      day,
      totalRides: entry?.total_rides ?? 0,
    }
  })

  const xScale = scaleBand()
    .domain(normalized.map(d => d.day))
    .range([margin.left, width - margin.right])
    .padding(0.2)

  const yMax = max(normalized, d => d.totalRides) ?? 0
  const yScale = scaleLinear()
    .domain([0, yMax > 0 ? yMax : 1])
    .nice()
    .range([height - margin.bottom, margin.top])

  return (
    <section>
      <h2 className="section-title">Rides by Day</h2>
      <div className="daily-chart-panel">
        <svg className="daily-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bar chart of total rides by day of week">
          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={height - margin.bottom}
            y2={height - margin.bottom}
            className="chart-axis"
          />

          {normalized.map(d => {
            const x = xScale(d.day)
            if (x === undefined) {
              return null
            }

            const y = yScale(d.totalRides)
            const barHeight = height - margin.bottom - y

            return (
              <g key={d.day}>
                <rect
                  x={x}
                  y={y}
                  width={xScale.bandwidth()}
                  height={barHeight}
                  className="daily-bar"
                />
                <text
                  x={x + xScale.bandwidth() / 2}
                  y={height - margin.bottom + 20}
                  textAnchor="middle"
                  className="chart-tick"
                >
                  {d.day.slice(0, 3)}
                </text>
                <text
                  x={x + xScale.bandwidth() / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="chart-value"
                >
                  {d.totalRides.toLocaleString()}
                </text>
              </g>
            )
          })}

          <text x={margin.left - 8} y={margin.top + 4} textAnchor="end" className="chart-y-label">
            Rides
          </text>
        </svg>
      </div>
    </section>
  )
}

export default DailyStatsBarChart
