import apiClient from './apiClient.js'
import { ENDPOINTS } from './apiConstants.js'

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
 * Fetches data range coverage information from the backend
 * @returns An object containing the minimum and maximum dates covered in the dataset
 */
export async function fetchDateRangeStats() {
    const { data } = await apiClient.get(ENDPOINTS.dateRange())
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