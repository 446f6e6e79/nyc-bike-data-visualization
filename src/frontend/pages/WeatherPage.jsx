import useWeatherStats from "../hooks/useWeatherStats"
import StatusMessage from "../components/StatusMessage"
import ScatterPlot from "../components/ScatterPlot"

//#TODO: Check codes
const WMO_WEATHER_CODES = {
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
    82  : "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}   

const GROUPED_WEATHER_CODES = {
    "Clear": [0, 1],
    "Cloudy": [2, 3],
    "Foggy": [45, 48],
    "Drizzle": [51, 53, 55, 56, 57],
    "Rain": [61, 63, 65, 66, 67],
    "Snow": [71, 73, 75, 77, 85, 86],
    "Showers": [80, 81, 82],
    "Thunderstorm": [95, 96, 99]
}
/**
 * WeatherPage 
 */
function WeatherPage({ filters = {} }) {
    const { weatherStats, loading, error } = useWeatherStats(filters)

    if (loading || error) {
        return <StatusMessage loading={loading} error={error} />
    }

    return (
        <div className="daily-chart-panel">
            <h2>Weather Impact on Ride Behaviour</h2>
            <p>Each point is a weather code. Colors group similar weather types to compare riding patterns.</p>
            <ScatterPlot
                data={weatherStats}
                weatherCodeLabels={WMO_WEATHER_CODES}
                weatherGroups={GROUPED_WEATHER_CODES}
            />
        </div>
    )
}

export default WeatherPage