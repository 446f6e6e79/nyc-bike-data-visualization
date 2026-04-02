import apiClient from '../clients/apiClient.js'
import { ENDPOINTS } from '../clients/apiConstants.js'

/**
 * Fetches all NYC bike route segments.
 * @returns {Promise<Array>} Array of bike route objects with geometry and properties.
 */
export async function fetchBikeRoutes() {
    const { data } = await apiClient.get(ENDPOINTS.bikeRoutes())
    return data
}