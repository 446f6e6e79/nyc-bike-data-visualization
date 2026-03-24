import { useState, useEffect, useCallback } from 'react'
import { ENDPOINTS } from '../api-data/apiConstants.js'
import apiClient from '../api-data/apiClient.js'
/** * Custom hook to fetch station ride counts with optional filters.
 * @param {Object} filters - Optional filters for the API request (e.g., { limit: 100, group_by: 'hour' }).
 * @returns {Object} An object containing stationRideCounts, loading state, error message, and a refetch function.
 */
function useStationRideCounts(filters = {}) {
  const [stationRideCounts, setStationRideCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch station ride counts with the provided filters (e.g., limit, group_by)
      const { data } = await apiClient.get(ENDPOINTS.stationRideCounts(), { params: filters })
      setStationRideCounts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetchCounts() }, [fetchCounts])

  return { stationRideCounts, loading, error, refetch: fetchCounts }
}

export default useStationRideCounts