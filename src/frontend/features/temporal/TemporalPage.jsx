import useTemporalState from "./hooks/useTemporalState"
import MetricSelector from "./components/MetricSelector"
import StatusMessage from "../../components/StatusMessage"
import SurfaceGraph from "./components/SurfaceGraph"
import SurfaceHistograms from "./components/SurfaceHistograms"

/**
 * Component for the temporal stats page, which includes a metric selector, the surface graph itself, and accompanying histograms.
 * @param {Object} filters - The filters to apply to the data.
 * @returns The rendered TemporalPage component, which displays the surface graph and histograms based on the selected metric and applied filters.
 */
function TemporalPage({ filters }) {
    // Use the custom hook to manage the temporal state, including the active metric, hovered coordinates, and fetched data for the surface graph and histograms. The hook also provides loading and error states to handle the data fetching process.
    const {
        activeMetric,
        setActiveMetric,
        coordinates,
        setCoordinates,
        dayHourStats,
        dayStats,
        hourStats,
        loading,
        error,
    } = useTemporalState(filters)

    return (
        <section className="page-card">
            <header className="page-card__header">
                <div className="page-card__heading">
                    <span className="page-card__eyebrow">Patterns</span>
                    <h2 className="page-card__title">Temporal distribution</h2>
                    <p className="page-card__subtitle">
                        How ridership shifts across days of the week and hours of the day.
                    </p>
                </div>
                <div className="page-card__actions">
                    <MetricSelector activeMetric={activeMetric} setActiveMetric={setActiveMetric} />
                </div>
            </header>
            <div className="page-card__body">
                {(loading || error) ? (
                    <StatusMessage loading={loading} error={error} />
                ) : (
                    <>
                        <SurfaceGraph data={dayHourStats} activeMetric={activeMetric} setCoordinates={setCoordinates} />
                        <SurfaceHistograms hourData={hourStats} dayData={dayStats} activeMetric={activeMetric} coordinates={coordinates} />
                    </>
                )}
            </div>
        </section>
    )
}

export default TemporalPage
