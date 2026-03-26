import { HexagonLayer } from '@deck.gl/aggregation-layers'

const COLOR_RANGE = [
  [219, 234, 254],
  [191, 219, 254],
  [147, 197, 253],
  [96, 165, 250],
  [59, 130, 246],
  [30, 64, 175],
]

const LAYER_CONFIG = {
  radius: 150,        // Radius in meters of each hexagon
  coverage: 0.8,      // Ratio of hexagon area covered ([0-1], 1 = no gaps)
  opacity: 0.75,
  upperPercentile: 100,
  extruded: true,
  elevationScale: 3,  // Scale elevation for better visibility
  pickable: true,
  gpuAggregation: false, // Must be false to carry station IDs in the tooltip
}

/**
 * Derives the domain ceiling, guarding against a zero max.
 * @param {number} maxStationUsage - The maximum station usage value across all stations.
 * @returns {number}
 */
function resolveColorScale(maxUsage) {
  return maxUsage > 0 ? maxUsage : 1
}

/**
 * Creates a hexagon layer for visualizing hourly bike usage at stations.
 * @param {Array} params.stations - Array of station objects with usage data.
 * @param {number} params.maxStationUsage - Maximum station usage value for color scaling.
 * @returns {HexagonLayer} The created hexagon layer.
 */
export function createStationUsageLayer({ stations, maxStationUsage }) {
  const colorScale = resolveColorScale(maxStationUsage)
  const domain = [0, colorScale]

  return new HexagonLayer({
    id: 'station-usage-layer',
    data: stations,
    ...LAYER_CONFIG,
    colorRange: COLOR_RANGE,
    getPosition: (station) => [station.lon, station.lat],
    getColorWeight: (station) => station.usage,
    colorAggregation: 'SUM',
    getElevationWeight: (station) => station.usage,
    elevationAggregation: 'SUM',
    colorDomain: domain,      // Scale colors based on max usage
    elevationDomain: domain,  // Keep elevation scaling fixed across animation frames
  })
}

/**
 * Generates a tooltip for station usage data.
 * @param {Object} object - The station usage data object.
 * @returns {string} The tooltip content.
 */
export function stationUsageTooltip(object) {
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

