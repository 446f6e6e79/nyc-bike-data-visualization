import { createBaseTileLayer } from './layers/baseTileLayer.js'
import { createStationGlowLayer, createStationUsageLayer } from './layers/stationUsageLayers.js'

export function buildLayers({ stations, maxUsage, tileUrl }) {
  return [
    createBaseTileLayer(tileUrl),
    createStationGlowLayer(stations, maxUsage),
    createStationUsageLayer(stations, maxUsage),
  ]
}
