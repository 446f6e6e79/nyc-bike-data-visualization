import apiClient from '../../../../clients/apiClient.js'
import { ENDPOINTS } from '../../../../clients/apiConstants.js'
/**
 * Fetches most frequent trips between station pairs, with optional filters
 * @param {*} filters
 * @returns An array of station-pair trip counts grouped by time buckets
 */
export async function fetchTripsBetweenStations(filters = {}) {
    const { data } = await apiClient.get(ENDPOINTS.tripsBetweenStations(), {
        params: filters,
    })
    return data
}