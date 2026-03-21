import { useState, useEffect, useCallback } from 'react'
import { ENDPOINTS } from '../api-data/apiConstants.js'
import apiClient from '../api-data/apiClient.js'

// useStationRideCounts.js — per-station data, its own filters
function useStationRideCounts(filters = {}) {
  const [stationRideCounts, setStationRideCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
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