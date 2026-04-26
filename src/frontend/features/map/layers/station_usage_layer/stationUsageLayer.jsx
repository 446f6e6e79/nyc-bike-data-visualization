import { HexagonLayer } from '@deck.gl/aggregation-layers'
import { STATION_USAGE_COLOR_RANGE } from '../../../../utils/styling/map.ts'

const LAYER_CONFIG = {
    radius: 150,
    coverage: 0.8,
    opacity: 0.75,
    upperPercentile: 100,
    extruded: true,
    elevationScale: 3,
    pickable: true,
    gpuAggregation: false,
}

/**
 * Creates a layer for displaying station usage data.
 * Color encodes per-station delta (usage - meanUsage): blue = below, orange = above.
 * Elevation still encodes absolute usage.
 * @param {Array} frameStations - Station data; each station must have usage and meanUsage.
 * @param {number} maxUsage - The maximum usage value for scaling elevation.
 * @param {number} maxDelta - The maximum absolute delta across all stations, for color scaling.
 * @returns {HexagonLayer} The created hexagon layer.
 */
export function createStationUsageLayer({ frameStations, maxUsage, maxDelta }) {
    const elevationScale = maxUsage > 0 ? maxUsage : 1

    // Symmetric domain around 0 so grey always means "exactly at mean"
    const spread = maxDelta > 0 ? maxDelta : 1
    const colorDomain = [-spread, spread]

    return new HexagonLayer({
        id: 'station-usage-layer',
        data: frameStations,
        ...LAYER_CONFIG,
        colorRange: STATION_USAGE_COLOR_RANGE,
        getPosition: (station) => [station.lon, station.lat],
        // Color weight is the delta from this station's own mean
        getColorWeight: (station) => station.usage - station.meanUsage,
        colorAggregation: 'SUM',
        getElevationWeight: (station) => station.usage,
        elevationAggregation: 'SUM',
        colorDomain,
        elevationDomain: [0, elevationScale],
    })
}
/**
* Creates a tooltip for station usage data.
* @param {Object} object - The data object associated with the hovered element on the map.
* @returns {string} The tooltip content.
*/
export function stationUsageTooltip(object) {
    if (Array.isArray(object.points) && object.points.length > 0) {
        const totalUsage = Math.round(object.points.reduce((sum, p) => sum + (Number(p.usage) || 0), 0))
        const ids = [...new Set(object.points.map((p) => p.stationId).filter(Boolean))]
        return `Station(s): ${object.points.length}\nUsage: ${totalUsage} rides\nIDs: ${ids.slice(0, 4).join(', ')}${ids.length > 4 ? ', …' : ''}`
    }
    const totalUsage = Math.round(Number(object.elevationValue ?? object.colorValue ?? 0) || 0)
    return `Station(s): ${Math.round(Number(object.count ?? 0) || 0)}\nUsage: ${totalUsage} rides`
}

/**
 * Returns the legend entries for the station usage layer as plain data.
 * `MapLegend` renders them uniformly alongside every other layer's entries.
 */
export function stationUsageLegend() {
    return {
        entries: [
            { swatch: 'rgb(194, 80, 26)', label: 'Well below mean' },
            { swatch: 'rgb(236, 230, 218)', label: 'At mean' },
            { swatch: 'rgb(10, 42, 122)', label: 'Well above mean' },
        ],
    }
}