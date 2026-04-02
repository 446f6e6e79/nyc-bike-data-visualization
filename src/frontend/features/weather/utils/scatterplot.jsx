import { WMO_WEATHER_CODES, getWeatherGroup } from "./wmo_code_handler.jsx"
import { getMetricValue } from "../../temporal/utils/metric_formatter.jsx"

// Function to determine the radius of each point in the scatter plot based on the total number of rides
export const pointRadius = rides => Math.max(4, Math.min(12, Math.sqrt(rides) / 5 + 3))

/**
 * Formats the weather data for use in the scatter plot
 * @param {Array} data - The raw weather data
 * @returns {Array} The formatted data with additional metrics and weather group information for each data point
 */
export function formatData(data) {
    return data.map(d => {
        const code = d.weather_code
        const weatherGroup = getWeatherGroup(code)
        const weatherLabel = WMO_WEATHER_CODES[code]
        const hoursCount = d.hours_count
        const totalRides = getMetricValue("total_rides", d)
        return {
            totalRides,
            avgDistanceKm: getMetricValue("average_distance", d),
            avgDurationMin: getMetricValue("average_duration_minutes", d),
            ridesPerHour: totalRides / hoursCount,
            weatherGroup,
            weatherLabel,
        }
    })
}