import useTemporalState from "./hooks/useTemporalState";
import MetricSelector from "./components/MetricSelector";
import StatusMessage from "../../components/StatusMessage";
import SurfaceGraph from "./components/SurfaceGraph";
import SurfaceHistograms from "./components/SurfaceHistograms";

/**
 * Component for the temporal stats page, which includes a metric selector, the surface graph itself, and accompanying histograms. 
 * @param {Object} filters - The filters to apply to the data.
 * @returns The rendered TemporalPage component, which displays the surface graph and histograms based on the selected metric and applied filters.
 */
function TemporalPage({filters}) {
    //#TODO: From this file and his children refactor the CSS inline styles to a file
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

    if (loading || error) {
        return <StatusMessage loading={loading} error={error} />
    }

    return (
        <>
            <MetricSelector activeMetric={activeMetric} setActiveMetric={setActiveMetric} />
            <SurfaceGraph data={dayHourStats} activeMetric={activeMetric} setCoordinates={setCoordinates} />
            <SurfaceHistograms hourData={hourStats} dayData={dayStats} activeMetric={activeMetric} coordinates={coordinates} />
        </>
    );
}

export default TemporalPage;