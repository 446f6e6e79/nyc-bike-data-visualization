import useWeatherStats from "./hooks/useWeatherStats"
import StatusMessage from "../../components/StatusMessage"
import ScatterPlot from "./components/ScatterPlot"

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