import { createBaseTileLayer } from './layers/baseTileLayer.js'
import { createStationUsageLayer } from './layers/stationUsageLayers.js'

export function buildLayers({ stations, maxUsage, tileUrl }) {
  return [
    createBaseTileLayer(tileUrl),
    createStationUsageLayer(stations, maxUsage),
  ]
}
