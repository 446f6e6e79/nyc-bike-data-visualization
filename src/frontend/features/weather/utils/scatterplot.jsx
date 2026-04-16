import { WMO_WEATHER_CODES, getWeatherGroup } from "./wmo_code_handler.jsx"

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
        const hoursCount = Number(d.hours_count || 0)
        const totalRides = Number(d.total_rides || 0)
        const ridesPerHour = hoursCount > 0 ? totalRides / hoursCount : 0
        const ridesPerDay = hoursCount > 0 ? totalRides / (hoursCount / 24) : 0
        return {
            totalRides,
            hoursCount,
            avgDistanceKm: Number(d.average_distance_km || 0),
            avgDurationMin: Number(d.average_duration_seconds || 0) / 60,
            avgSpeed: Number(d.average_speed_kmh || 0),
            ridesPerHour,
            ridesPerDay,
            weatherGroup,
            weatherLabel,
        }
    })
}