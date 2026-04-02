import apiClient from '../clients/apiClient.js'
import { ENDPOINTS } from '../clients/apiConstants.js'

/**
 * Fetches station availability information from the backend
 * @returns An array of station availability data, including station ID, 
 * number of available bikes, and number of empty docks
 */
export async function fetchStationAvailability() {
    const { data } = await apiClient.get(ENDPOINTS.stationsAvailability())
    return data
}