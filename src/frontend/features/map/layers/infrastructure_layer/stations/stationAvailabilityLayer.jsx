import { ScatterplotLayer } from '@deck.gl/layers'
import {
    HEALTHY_RGB,
    WARNING_RGB,
    DANGER_RGB,
    UNKNOWN_RGB,
} from '../../../../../utils/editorialTokens.js'

/**
 * Creates a scatterplot layer for displaying station availability information.
 * @param {Array} stations - An array of station objects, each containing:
 *   - latitude: number
 *   - longitude: number
 *   - capacity: number (total docks)
 *   - station_health: number (0 to 1, where 1 is fully healthy)
 * @returns
 */
export function createStationAvailabilityLayer({ stations }) {
    return new ScatterplotLayer({
        id: 'station-availability-layer',
        data: stations,
        getPosition: (d) => [d.longitude, d.latitude],
        getRadius: (d) => Math.sqrt(d.capacity) * 8, // larger stations appear bigger
        getFillColor: (d) => getStationColor(d.station_health),
        getLineColor: [255, 255, 255],
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        radiusMinPixels: 4,
        radiusMaxPixels: 30,
        pickable: true,
    })
}

/**
 * Maps station_health [0, 1] to an editorial color:
 * 0.0 → danger (no bikes, no docks — broken/disabled)
 * 0.5 → warning (heavily skewed toward full or empty)
 * 1.0 → healthy (balanced bikes and docks)
 * null → unknown (ink-muted)
 */
function getStationColor(health) {
    if (health == null) return UNKNOWN_RGB
    if (health >= 0.7) return HEALTHY_RGB
    if (health >= 0.4) return WARNING_RGB
    return DANGER_RGB
}


/** * Generates tooltip content for a station availability point.
 * @param {Object} object - The station data object
 * @returns {string} A formatted string with station information for the tooltip.
 */
export function stationAvailabilityTooltip( object ) {
    return `
            ${object.name}\n
            Available Classical Bikes: ${object.classicalBikes}
            Available Electric Bikes: ${object.electricBikes}
            Available Docks: ${object.available_docks}
            Total Capacity: ${object.capacity}
        `
}

/**
 * Returns the legend entries for the station availability layer as plain data.
 * `MapLegend` renders them uniformly alongside every other layer's entries.
 * When `showBikeRoutes` is true the legend also surfaces the bike-routes section.
 */
export function stationAvailabilityLegend({ showBikeRoutes = false } = {}) {
    return {
        entries: [
            { swatch: 'rgb(47, 125, 79)', label: 'Healthy', hint: 'bikes and docks available' },
            { swatch: 'rgb(200, 138, 26)', label: 'Skewed', hint: 'nearly full or empty' },
            { swatch: 'rgb(163, 45, 45)', label: 'Unhealthy', hint: 'broken or disabled' },
        ],
        includeBikeRoutes: showBikeRoutes,
    }
}
