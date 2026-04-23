import apiClient from '../../../clients/apiClient.js'
import { ENDPOINTS } from '../../../clients/apiConstants.js'

/**
 * Fetches stats grouped by weather conditions, used for surface graph rendering.
 * @param {*} filters
 * @returns 
 */
export async function fetchStatsByWeather(filters = {}) {
    // Fetch all rides, with requested breakdowns
    const { data } = await apiClient.get(ENDPOINTS.statsByWeather(), {
        params: filters,
    })
    // Convert durations from seconds to minutes for display purposes
    return data
}