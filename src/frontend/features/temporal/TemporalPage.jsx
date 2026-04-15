import useTemporalState from "./hooks/useTemporalState"
import MetricSelector from "./components/MetricSelector"
import SurfaceGraph from "./components/SurfaceGraph"
import SurfaceHistograms from "./components/SurfaceHistograms"
import VisualizationGuide from "../../components/VisualizationGuide"

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

                <VisualizationGuide
                    title="How To Read The Weekly Rhythm"
                    summary="The 3D surface shows how your selected metric changes at every day-hour intersection, while the two histograms break the same signal into simpler one-dimensional views."
                    hints={[
                        {
                            title: 'Read shape before numbers',
                            text: 'Ridges and valleys on the surface reveal recurring cycles. Focus on where the terrain rises consistently before inspecting exact values.',
                        },
                        {
                            title: 'Use metric switch as a lens',
                            text: 'Keep day/hour context fixed and switch metric to compare whether peaks are driven by volume, speed, or duration behavior.',
                        },
                        {
                            title: 'Validate with histograms',
                            text: 'After spotting a hotspot on the surface, verify if it is mostly a day effect or an hour effect using the corresponding histogram.',
                        },
                    ]}
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
