import useTemporalState from "./hooks/useTemporalState"
import MetricSelector from "./components/MetricSelector"
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
        refetch,
    } = useTemporalState(filters)
    const isActionsDisabled = loading || error

    return (
        <section className="page-card">
            <header className="page-card__header">
                <div className="page-card__heading">
                    <span className="page-card__eyebrow">02 — Rhythms</span>
                    <h2 className="page-card__title">The week, hour by hour.</h2>
                    <p className="page-card__subtitle">
                        How ridership swells and recedes across days of the week
                        and hours of the day.
                    </p>
                </div>
                <div className={`page-card__actions${isActionsDisabled ? ' surface-actions--disabled' : ''}`} aria-disabled={isActionsDisabled}>
                    <MetricSelector
                        activeMetric={activeMetric}
                        setActiveMetric={setActiveMetric}
                        disabled={isActionsDisabled}
                    />
                </div>
            </header>
            <div className="page-card__body">
                <SurfaceGraph
                    data={dayHourStats}
                    activeMetric={activeMetric}
                    setCoordinates={setCoordinates}
                    loading={loading}
                    error={error}
                    onRefetch={refetch}
                />
                <SurfaceHistograms
                    hourData={hourStats}
                    dayData={dayStats}
                    activeMetric={activeMetric}
                    coordinates={coordinates}
                    loading={loading}
                    error={error}
                    onRefetch={refetch}
                />
            </div>
        </section>
    )
}

export default TemporalPage
