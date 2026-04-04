import { ScatterplotLayer } from '@deck.gl/layers'

const STATION_COLOR_DEFAULT = [59, 130, 246]
const STATION_COLOR_SELECTED = [34, 197, 94]

/**
 * Creates a scatterplot layer for displaying all available stations as blue dots in trip flow view.
 * @param {Array} stations - Array of station objects with latitude, longitude, and optional capacity
 * @param {string[]} selectedStationIds - Station identifiers currently selected by click.
 * @param {Function} onStationPick - Click handler for station points.
 * @returns {ScatterplotLayer}
 */
export function createTripStationsLayer({ stations, selectedStationIds = [], onStationPick }) {
    const selectedStationIdSet = new Set(selectedStationIds)

    return new ScatterplotLayer({
    id: 'trip-flow-stations-layer',
    data: stations,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 20,    // Radius in meters
    getFillColor: (d) => selectedStationIdSet.has(d.id) ? STATION_COLOR_SELECTED : STATION_COLOR_DEFAULT,
    getLineColor: [255, 255, 255],
    lineWidthMinPixels: 1,
    stroked: true,
    filled: true,
    radiusUnits: 'meters',      // Use meters to keep consistency across zoom levels
    radiusMinPixels: 4,         // Minimum radius in pixels to ensure visibility at low zoom levels
    radiusMaxPixels: 80,        // Maximum radius in pixels to prevent excessive size at high zoom levels
    pickable: true,
    onClick: onStationPick,
    updateTriggers: {
        getFillColor: [selectedStationIds],
    },
})
}

export function tripStationTooltip(object) {
    return object.name ?? 'Unknown Station'
}