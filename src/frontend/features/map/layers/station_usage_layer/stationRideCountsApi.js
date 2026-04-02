import apiClient from '../../../../clients/apiClient.js'
import { ENDPOINTS } from '../../../../clients/apiConstants.js'
/**
 * Fetches ride counts for each station, with optional filters.
 * @param {*} filters
 * @returns An array of station ride counts.
 */
export async function fetchStationRideCounts(filters = {}) {
    const { data } = await apiClient.get(ENDPOINTS.stationRideCounts(), {
        params: filters,
    })
    return data
}

