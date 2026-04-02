import apiClient from '../clients/apiClient.js'
import { ENDPOINTS } from '../clients/apiConstants.js'

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

/**
 * Fetches stats grouped by day_of_week AND hour, used for surface graph rendering.
 * @param {*} filters
 * @returns 
 */
export async function fetchStats(filters = {}) {
    // Fetch all rides, with requested breakdowns
    const { data } = await apiClient.get(ENDPOINTS.stats(), {
        params: filters,
    })
    // Convert durations from seconds to minutes for display purposes
    return data
}