import { createBaseTileLayer } from './layers/baseTileLayer.js'
import { createFrequentTripsLayer } from './layers/frequentTripsLayer.js'
import { createStationUsageLayer } from './layers/stationUsageLayers.js'

/** * Builds the layers for the map based on the active layer and provided data*/
export function buildLayers({ stations, maxUsage, trips, maxTripUsage, activeLayer, tileUrl }) {
  // Add the base tile layer first
  const layers = [createBaseTileLayer(tileUrl)]
  
  // Conditionally add active station layers
  if (activeLayer === 'frequent_trips') {
    layers.push(createFrequentTripsLayer(trips, maxTripUsage))
  } 
  else if (activeLayer === 'station_usage') {
    layers.push(createStationUsageLayer(stations, maxUsage))
  }

  return layers
}
