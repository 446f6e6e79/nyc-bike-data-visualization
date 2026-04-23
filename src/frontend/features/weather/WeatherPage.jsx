import useWeatherStats from "./hooks/useWeatherStats"
import useWeatherRidgelineStats from "./hooks/useWeatherRidgelineStats"
import ScatterPlot from "./components/ScatterPlot"
import WeatherRidgeline from "./components/WeatherRidgeline"
import VisualizationGuide from "../../components/VisualizationGuide"

/**
 *  Component for the weather impact on ride behaviour page
 * @param {Object} filters - The filters to apply to the data, such as date range or user-selected filters.
 */
function WeatherPage({ filters = {} }) {
    // Fetch weather statistics using the custom hook
    const { weatherStats, loading, error, refetch } = useWeatherStats(filters)
    const {
        ridgelineStats,
        loading: ridgelineLoading,
        error: ridgelineError,
        refetch: refetchRidgeline,
    } = useWeatherRidgelineStats(filters)

    const loadingAll = loading || ridgelineLoading
    const errorAll = error || ridgelineError
    const refetchAll = () => Promise.all([refetch(), refetchRidgeline()])

    return (
        <section className="page-card">
            <header className="page-card__header">
                <div className="page-card__heading">
                    <span className="page-card__eyebrow">03 — Climate</span>
                    <h2 className="page-card__title">When the sky decides.</h2>
                    <p className="page-card__subtitle">
                        How average speed and trip frequency respond to the weather
                        over New York.
                    </p>
                </div>
            </header>
            <div className="page-card__body">
                <ScatterPlot
                    data={weatherStats}
                    loading={loadingAll}
                    error={errorAll}
                    onRefetch={refetchAll}
                />

                <WeatherRidgeline
                    data={ridgelineStats}
                    loading={loadingAll}
                    error={errorAll}
                    onRefetch={refetchAll}
                />

                <VisualizationGuide
                    mapName="Weather Impact"
                    title="How To Read It"
                    summary="Each point links weather conditions to mobility behavior. Use the chart to identify thresholds where weather starts changing trip speed or volume in a meaningful way."
                    hints={[
                        {
                            title: 'Look for clusters',
                            text: 'Tight clouds suggest stable behavior under similar weather, while spread-out clouds indicate more uncertainty in rider response.',
                        },
                        {
                            title: 'Watch for breakpoints',
                            text: 'Find where trends bend: a small weather change can trigger a strong drop or rise after a critical point.',
                        },
                        {
                            title: 'Compare with other views',
                            text: 'Use the ridgeline to inspect when each weather code concentrates over hours and weekdays, then connect that pattern to temporal peaks.',
                        },
                    ]}
                />
            </div>
        </section>
    )
}

export default WeatherPage
