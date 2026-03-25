import { createBaseTileLayer } from './layers/baseTileLayer.js'
import { createStationUsageLayer } from './layers/stationUsageLayers.js'

/** * Builds the layers for the map based on the active layer and provided data*/
export function buildLayers({ stations, maxUsage, activeLayer, tileUrl }) {
    // Add the base tile layer first
    const layers = [createBaseTileLayer(tileUrl)]

    // Conditionally add active station layers
    if (activeLayer === 'station_usage') {
        layers.push(createStationUsageLayer(stations, maxUsage))
    }

    return layers
}
