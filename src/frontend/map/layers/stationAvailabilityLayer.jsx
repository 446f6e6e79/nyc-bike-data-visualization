import { ScatterplotLayer } from '@deck.gl/layers'

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