import { HexagonLayer } from '@deck.gl/aggregation-layers'
/**
 * Creates a hexagon layer for visualizing hourly bike usage at stations.
 * @param {Array} stations - Array of station objects with usage data.
 * @param {number} maxUsage - Maximum usage value for color scaling.
 * @returns {HexagonLayer} The created hexagon layer.
 */
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
    radius: 150,                  // Radius in meters of each hexagon
    coverage: 0.8,                // Ratio of hexagon area actually covered by hexagons ([0-1] 1 means no gap between hexagons) 
    opacity: 0.75,
    upperPercentile: 100,         // Use all data points for color and elevation scaling
    colorDomain: [0, colorScale], // Scale colors based on max usage
    elevationDomain: [0, colorScale], // Keep elevation scaling fixed across animation frames
    extruded: true,               
    elevationScale: 3,            // Scale elevation for better visibility
    pickable: true,               // Enable picking for tooltips
  })
}
