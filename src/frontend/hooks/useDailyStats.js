import { useState, useEffect, useCallback } from 'react'
import { ENDPOINTS } from '../api-data/apiConstants.js'
import apiClient from '../api-data/apiClient.js'

function useDailyStats() {
  const [dailyStats, setDailyStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDailyStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get(ENDPOINTS.stats(), {
        params: { group_by: 'day_of_week' },
      })
      setDailyStats(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDailyStats() }, [fetchDailyStats])

  return { dailyStats, loading, error, refetch: fetchDailyStats }
}

export default useDailyStats