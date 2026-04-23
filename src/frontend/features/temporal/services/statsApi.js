import apiClient from '../../../clients/apiClient.js'
import { ENDPOINTS } from '../../../clients/apiConstants.js'

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