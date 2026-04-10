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

    return (
        <section className="page-card">
            <header className="page-card__header">
                <div className="page-card__heading">
                    <span className="page-card__eyebrow">Weather</span>
                    <h2 className="page-card__title">Weather impact on ride behaviour</h2>
                    <p className="page-card__subtitle">
                        How average speed and trip frequency respond to different weather conditions.
                    </p>
                </div>
            </header>
            <div className="page-card__body">
                {(loading || error) ? (
                    <StatusMessage loading={loading} error={error} />
                ) : (
                    <ScatterPlot data={weatherStats} />
                )}
            </div>
        </section>
    )
}

export default WeatherPage
