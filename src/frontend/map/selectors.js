export function selectStations(stationRideCounts) {
  const stationRows = Array.isArray(stationRideCounts) ? stationRideCounts : []

  return stationRows
    .map((station) => {
      const outgoing = station.outgoing_rides ?? station.outgoingRides ?? 0
      const incoming = station.incoming_rides ?? station.incomingRides ?? 0

      return {
        stationId: station.station_id ?? station.stationId,
        lat: station.lat,
        lon: station.lon,
        usage: outgoing + incoming,
      }
    })
    .filter(
      (station) =>
        Number.isFinite(station.lat) &&
        Number.isFinite(station.lon) &&
        Number.isFinite(station.usage)
    )
}

// Get the maximum usage value from the stations for scaling purposes
export function getMaxUsage(stations) {
  if (!Array.isArray(stations) || stations.length === 0) {
    return 0
  }

  return Math.max(...stations.map((station) => station.usage))
}

// Get the average usage across all stations for display in the legend
export function getAverageUsage(stations) {
  if (!Array.isArray(stations) || stations.length === 0) {
    return 0
  }
  const totalUsage = stations.reduce((acc, station) => acc + station.usage, 0)
  return Math.round(totalUsage / stations.length)
}
