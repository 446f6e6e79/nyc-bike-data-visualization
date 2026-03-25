import { ArcLayer } from '@deck.gl/layers'

export function createFrequentTripsLayer(trips, maxTripUsage) {
  const usageScale = maxTripUsage > 0 ? maxTripUsage : 1

  return new ArcLayer({
    id: 'frequent-trips-layer',
    data: trips,
    getSourcePosition: (trip) => trip.sourcePosition,
    getTargetPosition: (trip) => trip.targetPosition,
    getWidth: (trip) => {
      const normalizedUsage = (Number(trip.hourly_rides) || 0) / usageScale
      return 1 + normalizedUsage * 6
    },
    getSourceColor: (trip) => {
      const normalizedUsage = (Number(trip.hourly_rides) || 0) / usageScale
      const alpha = Math.round(80 + normalizedUsage * 175)
      return [14, 116, 144, alpha]
    },
    getTargetColor: (trip) => {
      const normalizedUsage = (Number(trip.hourly_rides) || 0) / usageScale
      const alpha = Math.round(80 + normalizedUsage * 175)
      return [2, 132, 199, alpha]
    },
    pickable: true,
    opacity: 0.75,
    widthMinPixels: 1,
    widthMaxPixels: 8,
    greatCircle: false,
    parameters: {
      depthTest: false,
    },
  })
}