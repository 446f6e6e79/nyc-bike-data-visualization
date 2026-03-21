// hooks/useStatsData.js
import { useState, useEffect, useCallback } from 'react'
import { ENDPOINTS } from '../api-data/apiConstants.js'
import apiClient from '../api-data/apiClient.js'

const toDisplayStats = (item) => ({
  ...item,
  average_duration_minutes: item.average_duration_seconds / 60,
  total_duration_minutes: item.total_duration_seconds / 60,
})

function useStatsData() {
  const [rideStats, setRideStats] = useState([])
  const [userStats, setUserStats] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [classic, electric, member, casual] = await Promise.all([
        (await apiClient.get(ENDPOINTS.stats(), { params: { bike_type: 'classic_bike' } })).data,
        (await apiClient.get(ENDPOINTS.stats(), { params: { bike_type: 'electric_bike' } })).data,
        (await apiClient.get(ENDPOINTS.stats(), { params: { user_type: 'member' } })).data,
        (await apiClient.get(ENDPOINTS.stats(), { params: { user_type: 'casual' } })).data,
      ])

      setRideStats([
        { ...toDisplayStats(classic), rideable_type: 'classic_bike' },
        { ...toDisplayStats(electric), rideable_type: 'electric_bike' },
      ])
      setUserStats([
        { ...toDisplayStats(member), user_type: 'member' },
        { ...toDisplayStats(casual), user_type: 'casual' },
      ])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { rideStats, userStats, loading, error, refetch: fetchAll }
}

export default useStatsData