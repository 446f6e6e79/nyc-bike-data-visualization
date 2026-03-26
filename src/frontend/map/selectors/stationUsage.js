
const HOURS_IN_DAY = 24

/**
 * Transforms raw station ride count data into a format suitable for map visualization.
 * Keeps an hourly usage array (index 0-23) on each station for animation frames.
 * @param {Array} stationRideCounts - An array of station ride count objects.
 * @returns {Array} An array of transformed station objects suitable for map visualization.
 */
export function selectStations(stationRideCounts) {
    const stationRows = Array.isArray(stationRideCounts) ? stationRideCounts : []
    // For each station, create an hourly usage array based on the grouped data.
    return stationRows
        .map((station) => {
            // Initialize an array to hold average rides for each hour of the day.
            const hourlyUsage = Array.from({ length: HOURS_IN_DAY }, () => 0)
            if (Array.isArray(station.groups)) {
                station.groups.forEach((group) => {
                    // Extract hour and rides count
                    const hour = Number(group.hour)
                    const daysCount = Number(group.days_count)
                    const totalRides = Number(group.total_rides)
                    // Add the average rides for this hour to the corresponding index in the hourly usage array
                    hourlyUsage[hour] += totalRides / daysCount
                }
                )
            }
            return {
                stationId: station.station_id,
                lat: station.lat,
                lon: station.lon,
                hourlyUsage,        // Array of average rides for each hour
                meanUsagePerHour: hourlyUsage.reduce((sum, usage) => sum + usage, 0) / HOURS_IN_DAY, // Average usage across all hours
            }
        })
        // Filter out stations that don't have valid latitude, longitude, or hourly usage data.
        .filter(
            (station) =>
                Number.isFinite(station.lat) &&
                Number.isFinite(station.lon) &&
                Array.isArray(station.hourlyUsage)
        )
}

/**
 * Returns station features for a specific hour frame.
 * @param {Array} stations - Station list from selectStations.
 * @param {number} hour - Hour frame index (0-23).
 * @returns {Array} Station list with usage for the selected hour.
 */
export function getStationForCurrentTime(stations, hour) {
    // For each station, extract the usage for the selected hour
    return stations.map((station) => ({
        stationId: station.stationId,
        lat: station.lat,
        lon: station.lon,
        usage: interpolateStationUsage(station, hour), // Use interpolation for smoother animation
        meanUsage: station.meanUsagePerHour, // Pass trough for per-station color scaling
    }))
}

/**
 * Helper function to interpolate station usage between two hours for smoother animation.
 * This allows the animation to show gradual changes in usage rather than abrupt jumps at each hour.
 * @param {Object} station Station object with hourlyUsage array. 
 * @param {number} time Current time frame (can be a fractional hour for interpolation, e.g., 14.5 for halfway between 14:00 and 15:00).
 * @returns {number} the interpolated usage value for the station at the given time frame.
 */
function interpolateStationUsage(station, time) {
    // Normalize hour to [0,23]
    const normalizedHour = ((time % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY
    // Get the lower and upper hour indices for interpolation
    const lowerHour = Math.floor(normalizedHour)
    const higherHour = (lowerHour + 1) % HOURS_IN_DAY
    const t = normalizedHour - lowerHour // Fractional part for interpolation
    const lowerUsageValue = station.hourlyUsage[lowerHour]
    const higherUsageValue = station.hourlyUsage[higherHour]

    // Linear interpolation between the two hours
    return lowerUsageValue + (higherUsageValue - lowerUsageValue) * t
}

/**
 * Get the maximum usage across all stations and hours for scaling the map visualization.
 * @param {Object} stations - Station list from selectStations. 
 * @returns {number} The maximum usage value.
 */
export function getMaxUsage(stations) {
    return stations.reduce((globalMax, station) => {
        // Get the maximum usage for this station across all hours
        const stationMax = Array.isArray(station.hourlyUsage)
            ? Math.max(...station.hourlyUsage.map((usage) => Number(usage) || 0))
            : 0
        return Math.max(globalMax, stationMax)
    }, 0)
}

/**
 * Get the maximum absolute delta between hourly usage and mean usage across all stations and hours.
 * Used to set a symmetric color domain so neutral grey always represents the mean.
 * @param {Object} stations - Station list from selectStations.
 * @returns {number} The maximum absolute delta value.
 */
export function getMaxDelta(stations) {
    return stations.reduce((globalMax, station) => {
        if (!Array.isArray(station.hourlyUsage)) return globalMax
        const stationMax = station.hourlyUsage.reduce((max, usage) => {
            return Math.max(max, Math.abs(usage - station.meanUsagePerHour))
        }, 0)
        return Math.max(globalMax, stationMax)
    }, 0)
}