import { ScatterplotLayer } from '@deck.gl/layers'

function getUsageRadius(usage, maxUsage) {
  if (maxUsage <= 0) {
    return 20
  }

  return 20 + (usage / maxUsage) * 420
}

function getUsageColor(usage, maxUsage) {
  if (maxUsage <= 0) {
    return [96, 165, 250, 190]
  }

  const ratio = usage / maxUsage
  if (ratio >= 0.66) {
    return [30, 64, 175, 230]
  }
  if (ratio >= 0.33) {
    return [37, 99, 235, 210]
  }
  return [96, 165, 250, 190]
}

export function createStationGlowLayer(stations, maxUsage) {
  return new ScatterplotLayer({
    id: 'station-usage-glow-layer',
    data: stations,
    getPosition: (station) => [station.lon, station.lat],
    getFillColor: [56, 189, 248, 45],
    stroked: false,
    filled: true,
    radiusUnits: 'meters',
    radiusMinPixels: 4,
    radiusMaxPixels: 40,
    getRadius: (station) => getUsageRadius(station.usage, maxUsage) * 1.8,
    pickable: false,
  })
}

export function createStationUsageLayer(stations, maxUsage) {
  return new ScatterplotLayer({
    id: 'station-usage-layer',
    data: stations,
    getPosition: (station) => [station.lon, station.lat],
    getFillColor: (station) => getUsageColor(station.usage, maxUsage),
    getLineColor: [191, 219, 254, 230],
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 1,
    stroked: true,
    filled: true,
    radiusUnits: 'meters',
    radiusMinPixels: 2,
    radiusMaxPixels: 24,
    getRadius: (station) => getUsageRadius(station.usage, maxUsage),
    pickable: true,
  })
}
