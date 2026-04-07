import { WMO_WEATHER_CODES, getWeatherGroup } from "./wmo_code_handler.jsx"
import { getMetricValue } from "../../temporal/utils/metric_formatter.jsx"

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
            hoursCount,
            avgDistanceKm: getMetricValue("average_distance", d),
            avgDurationMin: getMetricValue("average_duration_minutes", d),
            avgSpeed: getMetricValue("average_speed_kmh", d),
            ridesPerHour: totalRides / hoursCount,
            weatherGroup,
            weatherLabel,
        }
    })
}