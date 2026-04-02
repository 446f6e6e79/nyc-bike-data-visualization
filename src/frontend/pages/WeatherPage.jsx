import useWeatherStats from "../hooks/useWeatherStats"
import StatusMessage from "../components/StatusMessage"
import ScatterPlot from "../components/ScatterPlot"

//#TODO: Check codes
// World Meteorological Organization (WMO) weather codes and their descriptions
export const WMO_WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}   
//#TODO: Revise grouping
/**
 * Groups weather codes into broader categories, assigning a label and color to each group
 */
export const GROUPED_WEATHER_CODES = {
  Clear:        [[0, 1], "#1f77b4"],
  Cloudy:       [[2, 3], "#4f6d7a"],
  Foggy:        [[45, 48], "#7f8c8d"],
  Drizzle:      [[51, 53, 55, 56, 57], "#2a9d8f"],
  Rain:         [[61, 63, 65, 66, 67], "#0a9396"],
  Snow:         [[71, 73, 75, 77, 85, 86], "#9b5de5"],
  Showers:      [[80, 81, 82], "#3a86ff"],
  Thunderstorm: [[95, 96, 99], "#d62828"]
}

/**
 * Determines the weather group for a given WMO weather code by checking which group contains the code
 * @param {number} code - The WMO weather code to classify into a group
 * @returns {string} The label of the weather group that the code belongs to, or "Other" if it doesn't match any group
*/
export function getWeatherGroup(code) {
    for (const [group, [codes]] of Object.entries(GROUPED_WEATHER_CODES)) {
        if (codes.includes(code)) return group
    }
    return "Other"
}
/**
 *  Component for the weather impact on ride behaviour page
 * @param {Object} filters - The filters to apply to the data, such as date range or user-selected filters. 
 */
function WeatherPage({ filters = {} }) {
    // Fetch weather statistics using the custom hook
    const { weatherStats, loading, error } = useWeatherStats(filters)
    // Display loading or error message if data is still loading or if there was an error
    if (loading || error) {
        return <StatusMessage loading={loading} error={error} />
    }

    return (
        <div className="daily-chart-panel">
            <h2>Weather Impact on Ride Behaviour</h2>
            <ScatterPlot
                data={weatherStats}
            />
        </div>
    )
}

export default WeatherPage