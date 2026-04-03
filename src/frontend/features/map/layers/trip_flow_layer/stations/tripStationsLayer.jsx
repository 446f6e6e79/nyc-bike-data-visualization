import { ScatterplotLayer } from '@deck.gl/layers'

/**
 * Creates a scatterplot layer for displaying all available stations as blue dots in trip flow view.
 * @param {Array} stations - Array of station objects with latitude, longitude, and optional capacity
 * @returns {ScatterplotLayer}
 */
export function createTripStationsLayer({ stations }) {
    return new ScatterplotLayer({
        id: 'trip-flow-stations-layer',
        data: stations,
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => 6, // Fixed radius for all stations
        getFillColor: [59, 130, 246], // Blue color: rgb(59, 130, 246)
        getLineColor: [255, 255, 255],
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        radiusUnits: 'pixels',
        radiusMinPixels: 2,
        radiusMaxPixels: 5,
        pickable: true,
    })
}

/**
 * Generates a tooltip for trip station data, showing the station name.
 * @param {Object} object - The trip station data object.
 * @returns {string} The tooltip content.
 */
export function tripStationTooltip(object) {
    const stationName = object.name || 'Unknown Station'
    return stationName
}
