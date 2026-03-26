/**
 * Renders a tooltip based on the active layer and the provided object.
 * @param {Object} object - The data object associated with the hovered element on the map.
 * @param {string} activeLayer - The currently active map layer to determine tooltip content. 
 * @returns 
 */
export default function Tooltip({ object, activeLayer }) {
    // To avoid errors when hovering over empty areas of the map
    if (!object) return null
    switch (activeLayer) {
        case 'station_usage':
            return stationUsageTooltip(object)
        case 'trip_flow':
            return tripFlowTooltip(object)
        default:
            return null
    }
}

/**
 * Generates a tooltip for trip flow data, showing the number of rides between two stations.
 * @param {Object} object - The trip flow data object.
 * @returns {string} The tooltip content.
 */
function tripFlowTooltip(object) {
    console.log('Generating tooltip for trip flow:', object)
    const rides = Math.round(Number(object.total_daily_flow) || 0)
    const from = object.start_station_name 
    const to = object.end_station_name 
    return `Trip: ${from} → ${to}\nRides: ${rides}`
}

/**
 * Generates a tooltip for station usage data.
 * @param {Object} object - The station usage data object.
 * @returns {string} The tooltip content.
 */
function stationUsageTooltip(object) {
    const points = Array.isArray(object.points) ? object.points : []
    if (points.length > 0) {
        const totalUsage = Math.round(
            points.reduce((sum, point) => sum + (Number(point.usage) || 0), 0)
        )
        const uniqueStationIds = [...new Set(points.map((point) => point.stationId).filter(Boolean))]
        const stationPreview = uniqueStationIds.slice(0, 4).join(', ')
        const stationSuffix = uniqueStationIds.length > 4 ? ', …' : ''

        return `Stations: ${points.length}\nUsage: ${totalUsage} rides\nIDs: ${stationPreview}${stationSuffix}`
    }
    const totalUsage = Math.round(Number(object.elevationValue ?? object.colorValue ?? 0) || 0)
    const count = Math.round(Number(object.count ?? 0) || 0)
    return `Stations: ${count}\nUsage: ${totalUsage} rides`
}

