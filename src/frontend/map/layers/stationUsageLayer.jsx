import { HexagonLayer } from '@deck.gl/aggregation-layers'

// Color range for station usage, from light to dark blue
const COLOR_RANGE = [
    [219, 234, 254],
    [191, 219, 254],
    [147, 197, 253],
    [96, 165, 250],
    [59, 130, 246],
    [30, 64, 175],
]
// Base configuration for the hexagon layer, can be adjusted as needed
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
 * @param {Array} frameStations - The array of station data for the current frame.
 * @param {number} maxUsage - The maximum usage value for scaling colors.
 * @returns {HexagonLayer} The created hexagon layer.
 */
export function createStationUsageLayer({ frameStations, maxUsage }) {
    const colorScale = maxUsage > 0 ? maxUsage : 1
    const domain = [0, colorScale]

    return new HexagonLayer({
        id: 'station-usage-layer',
        data: frameStations,
        ...LAYER_CONFIG,
        colorRange: COLOR_RANGE,
        getPosition: (station) => [station.lon, station.lat],
        getColorWeight: (station) => station.usage,
        colorAggregation: 'SUM',
        getElevationWeight: (station) => station.usage,
        elevationAggregation: 'SUM',
        colorDomain: domain,
        elevationDomain: domain,
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