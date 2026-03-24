import apiClient from './apiClient.js'
import { ENDPOINTS } from './apiConstants.js'

/**
 * Converts stats data to a display-friendly format
 * @param {*} item 
 * @returns An object with average and total duration converted from seconds to minutes, along with original properties
 */
const toDisplayStats = (item) => ({
  ...item,
  average_duration_minutes: item.average_duration_seconds / 60,
  total_duration_minutes: item.total_duration_seconds / 60,
})

/**
 * Fetches stats data for different bike types and user types in parallel
 * @param {*} filters
 * @returns An object containing rideStats and userStats arrays with display-friendly data
 */
export async function fetchStatsData(filters = {}) {
  const [classic, electric, member, casual] = await Promise.all([
    apiClient.get(ENDPOINTS.stats(), {
      params: { ...filters, bike_type: 'classic_bike' },
    }).then((res) => res.data),

    apiClient.get(ENDPOINTS.stats(), {
      params: { ...filters, bike_type: 'electric_bike' },
    }).then((res) => res.data),

    apiClient.get(ENDPOINTS.stats(), {
      params: { ...filters, user_type: 'member' },
    }).then((res) => res.data),

    apiClient.get(ENDPOINTS.stats(), {
      params: { ...filters, user_type: 'casual' },
    }).then((res) => res.data),
  ])

  return {
    rideStats: [
      { ...toDisplayStats(classic), rideable_type: 'classic_bike' },
      { ...toDisplayStats(electric), rideable_type: 'electric_bike' },
    ],
    userStats: [
      { ...toDisplayStats(member), user_type: 'member' },
      { ...toDisplayStats(casual), user_type: 'casual' },
    ],
  }
}

/**
 * Fetches daily stats grouped by day of the week
 * @returns An array of stats data grouped by day of the week, with display-friendly duration values
 */
export async function fetchDailyStats(filters = {}) {
  const { data } = await apiClient.get(ENDPOINTS.stats(), {
    params: { ...filters, group_by: 'day_of_week' },
  })

  return data
}

/**
 * Fetches data range coverage stats for the dataset
 * @returns An object containing the minimum and maximum dates covered in the dataset
 */
export async function fetchDateRangeStats() {
  const { data } = await apiClient.get(ENDPOINTS.dateRange())
  return data
}

