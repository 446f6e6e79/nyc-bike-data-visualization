import { createBaseTileLayer } from './layers/baseTileLayer.js'
import { createStationUsageLayer } from './layers/stationUsageLayer.js'
import { createTripFlowLayer } from './layers/tripFlowLayer.js'

/**
 * Builds the array of layers to be rendered on the map based on the active layer and provided data.
 * @param {Object} stations - Station data with hourly usage.
 * @param {Object} trips - Trip data with hourly usage.
 * @param {number} maxStationUsage - Maximum station usage value for scaling.
 * @param {number} maxTripCount - Maximum trip count for scaling.
 * @param {string} activeLayer - The currently active layer to display.
 * @param {string} tileUrl - URL for the base tile layer. 
 * @returns 
 */
export function buildLayers({
    stations,           // Station data with hourly usage
    trips,              //trip data with hourly usage
    maxStationUsage,    // Maximum station count for scaling
    maxTripCount,       // Maximum trip count for scaling
    activeLayer,        // The currently active layer to display
    tileUrl             // URL for the base tile layer
}) {
    // Add the base tile layer first
    const layers = [createBaseTileLayer(tileUrl)]

    // Conditionally add active station layers
    if (activeLayer === 'station_usage') {
        layers.push(createStationUsageLayer({ 
            stations: stations, 
            maxStationUsage: maxStationUsage 
        }))
    } else if (activeLayer === 'trip_flow') {
        layers.push(createTripFlowLayer({ 
            trips: trips, 
            maxTripCount: maxTripCount 
        }))
    }

    return layers
}