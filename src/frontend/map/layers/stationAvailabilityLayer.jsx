import { ScatterplotLayer } from '@deck.gl/layers'

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
 * Maps station_health [0, 1] to a color gradient:
 * 0.0 → red   (no bikes, no docks — broken/disabled)
 * 0.5 → amber (heavily skewed toward full or empty)
 * 1.0 → green (healthy balance of bikes and docks)
 */
function getStationColor(health) {
    if (health === null || health === undefined) return [150, 150, 150] // unknown → grey
    if (health >= 0.7) return [34, 197, 94]   // green
    if (health >= 0.4) return [234, 179, 8]   // amber
    return [239, 68, 68]                      // red
}


/** * Generates tooltip content for a station availability point.
 * @param {Object} object - The station data object 
 * @returns {string} A formatted string with station information for the tooltip.
 */
export function stationAvailabilityTooltip( object ) {
    console.log(object)
    return `
            ${object.name}\n
            Available Classical Bikes: ${object.classicalBikes}
            Available Electric Bikes: ${object.electricBikes}
            Available Docks: ${object.available_docks}
            Total Capacity: ${object.capacity}
        `
}

/**
 * Renders the legend for the station availability layer, explaining the color coding of station health.
 * @returns The JSX for the station availability legend, which includes a description of the color coding used to represent station health (green, amber, red).
 */
export function stationAvailabilityLegend() {
    return (
        <div className="map-legend">
            <div className="map-legend-desc">
                <small>
                    <b>Green</b>: Healthy balance<br />
                    <b>Amber</b>: Skewed (almost full/empty)<br />
                    <b>Red</b>: Unhealthy (broken/disabled)
                </small>
            </div>
        </div>
    )
}
        