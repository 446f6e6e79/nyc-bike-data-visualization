export const API_BASE_URL = 'http://localhost:8000'

export const ENDPOINTS = {
  // Stations
  stations:                () => `${API_BASE_URL}/stations/`,
  stationsAvailability:    () => `${API_BASE_URL}/stations/availability`,
  stationsEmpty:           () => `${API_BASE_URL}/stations/empty`,
  stationById:             (id) => `${API_BASE_URL}/stations/${id}`,
  stationAvailabilityById: (id) => `${API_BASE_URL}/stations/${id}/availability`,

  // Rides
  rides:                   () => `${API_BASE_URL}/rides/`,
  rideById:                (id) => `${API_BASE_URL}/rides/by_ride_id/${id}`,

  // Stats
  stats:                   () => `${API_BASE_URL}/stats/`,
  stationRideCounts:       () => `${API_BASE_URL}/stats/station_ride_counts`,
  tripsBetweenStations:    () => `${API_BASE_URL}/stats/trips_between_stations`,
  dateRange:               () => `${API_BASE_URL}/stats/date_range`,
}