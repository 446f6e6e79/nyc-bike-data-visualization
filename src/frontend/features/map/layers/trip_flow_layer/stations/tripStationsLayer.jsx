import { ScatterplotLayer } from '@deck.gl/layers'

/**
 * Creates a scatterplot layer for displaying all available stations as blue dots in trip flow view.
 * @param {Array} stations - Array of station objects with latitude, longitude, and optional capacity
 * @param {string[]} selectedStationIds - Station identifiers currently selected by click.
 * @param {Function} onStationPick - Click handler for station points.
 * @returns {ScatterplotLayer}
 */
export function createTripStationsLayer({ stations, selectedStationIds = [], onStationPick }) {
    const selectedStationIdSet = new Set(selectedStationIds)
    //#TODO: Fix graphically the visibility of the dots
    return new ScatterplotLayer({
        id: 'trip-flow-stations-layer',
        data: stations,
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => 6, // Fixed radius for all stations
        getFillColor: (d) => {
            const stationKey = d.id
            return stationKey && selectedStationIdSet.has(stationKey)
                ? [34, 197, 94]
                : [59, 130, 246]
        },
        getLineColor: [255, 255, 255],
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        radiusUnits: 'pixels',
        radiusMinPixels: 2,
        radiusMaxPixels: 5,
        pickable: true,
        onClick: onStationPick,
        updateTriggers: {
            getFillColor: [selectedStationIds],
        },
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
