import { HexagonLayer } from '@deck.gl/aggregation-layers'

// Diverging color range: blue (below mean) → neutral grey → orange (above mean)
const COLOR_RANGE = [
    [10, 60, 180],    // deep blue
    [50, 120, 220],   // medium blue
    [140, 190, 245],  // light blue
    [160, 230, 175],  // light green
    [40, 170, 80],    // green
    [10, 110, 40],    // deep green
]

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
        colorRange: COLOR_RANGE,
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
        return `Stations: ${object.points.length}\nUsage: ${totalUsage} rides\nIDs: ${ids.slice(0, 4).join(', ')}${ids.length > 4 ? ', …' : ''}`
    }
    const totalUsage = Math.round(Number(object.elevationValue ?? object.colorValue ?? 0) || 0)
    return `Stations: ${Math.round(Number(object.count ?? 0) || 0)}\nUsage: ${totalUsage} rides`
}

/**
* Creates the legend for the station usage layer.
* @returns JSX element representing the legend for station usage.
*/
export function stationUsageLegend() {
    return (
        <div className="map-legend">
            <div className="map-legend-scale" aria-hidden>
                <span className="map-dot map-dot-low" />
                <span className="map-dot map-dot-mid" />
                <span className="map-dot map-dot-high" />
            </div>
        </div>
    )
}