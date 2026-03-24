import apiClient from './apiClient.js'
import { ENDPOINTS } from './apiConstants.js'

/**
 * Fetches ride counts for each station, with optional filters
 * @param {*} filters 
 * @returns An array of station ride counts, with display-friendly data
 */
export async function fetchStationRideCounts(filters = {}) {
  const { data } = await apiClient.get(ENDPOINTS.stationRideCounts(), {
    params: filters,
  })

  return data
}
