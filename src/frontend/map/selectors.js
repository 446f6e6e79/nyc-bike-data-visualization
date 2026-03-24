const HOURS_IN_DAY = 24

/**
 * Transforms raw station ride count data into a format suitable for map visualization.
 * Keeps an hourly usage array (index 0-23) on each station for animation frames.
 * @param {Array} stationRideCounts - An array of station ride count objects.
 * @returns {Array} An array of transformed station objects suitable for map visualization.
 */
export function selectStations(stationRideCounts) {
  const stationRows = Array.isArray(stationRideCounts) ? stationRideCounts : []
  // For each station, create an hourly usage array based on the grouped data. This allows us to easily access usage for any hour frame when animating.
  return stationRows
    .map((station) => {
      const hourlyUsageByHour = Array.from({ length: HOURS_IN_DAY }, () => 0)

      if (Array.isArray(station.groups)) {
        station.groups.forEach((group) => {
          // Extract hour and rides count
          const hour = Number(group.hour)
          const daysCount = Number(group.days_count)
          const totalRides = Number(group.total_rides)
          // Add the average rides for this hour to the corresponding index in the hourly usage array
          hourlyUsageByHour[hour] += totalRides / daysCount
          }
        )
      }

      return {
        stationId: station.station_id ?? station.stationId,
        lat: station.lat,
        lon: station.lon,
        hourlyUsageByHour,
      }
    })
    .filter(
      (station) =>
        Number.isFinite(station.lat) &&
        Number.isFinite(station.lon) &&
        Array.isArray(station.hourlyUsageByHour)
    )
}

/**
 * Returns station features for a specific hour frame.
 * @param {Array} stations - Station list from selectStations.
 * @param {number} hour - Hour frame index (0-23).
 * @returns {Array} Station list with hourly_usage for the selected hour.
 */
export function getStationsForHour(stations, hour) {
  const stationRows = Array.isArray(stations) ? stations : []
  const selectedHour = Number.isInteger(hour) ? hour : 0

  return stationRows.map((station) => ({
    stationId: station.stationId,
    lat: station.lat,
    lon: station.lon,
    hourly_usage: Number(station.hourlyUsageByHour?.[selectedHour] ?? 0),
  }))
}

/** Get the maximum usage value across all stations for scaling the map visualization */
export function getMaxUsage(stations) {
  if (!Array.isArray(stations) || stations.length === 0) {
    return 0
  }

  return Math.max(
    ...stations.map((station) => Number(station.hourly_usage ?? station.daily_usage ?? station.usage ?? 0) || 0)
  )
}

/** Get the average usage across all stations for display in the legend */
export function getAverageUsage(stations) {
  if (!Array.isArray(stations) || stations.length === 0) {
    return 0
  }

  const totalUsage = stations.reduce(
    (acc, station) => acc + (Number(station.hourly_usage ?? station.daily_usage ?? station.usage ?? 0) || 0),
    0
  )

  return Math.round(totalUsage / stations.length)
}
