import { HexagonLayer } from '@deck.gl/aggregation-layers'

export function createStationUsageLayer(stations, maxUsage) {
  const colorScale = maxUsage > 0 ? maxUsage : 1

  return new HexagonLayer({
    id: 'station-usage-layer',
    data: stations,
    gpuAggregation: false,  // Must be false to carry station IDs in the tooltip
    getPosition: (station) => [station.lon, station.lat],
    getColorWeight: (station) => station.usage,
    colorAggregation: 'SUM',
    getElevationWeight: (station) => station.usage,
    elevationAggregation: 'SUM',
    colorRange: [
      [219, 234, 254],
      [191, 219, 254],
      [147, 197, 253],
      [96, 165, 250],
      [59, 130, 246],
      [30, 64, 175],
    ],
    radius: 180,
    coverage: 0.9,
    opacity: 0.75,
    upperPercentile: 100,
    colorDomain: [0, colorScale],
    extruded: true,
    elevationScale: 10,   // Scale elevation for better visibility
    pickable: true,       // Enable picking for tooltips
  })
}
