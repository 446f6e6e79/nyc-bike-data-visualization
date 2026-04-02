import apiClient from '../../../clients/apiClient.js'
import { ENDPOINTS } from '../../../clients/apiConstants.js'

/**
 * Fetches data range coverage information from the backend
 * @returns An object containing the minimum and maximum dates covered in the dataset
 */
export async function fetchDateRange() {
    const { data } = await apiClient.get(ENDPOINTS.dateRange())
    return data
}