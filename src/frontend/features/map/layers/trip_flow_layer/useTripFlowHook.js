import useStationAvailability from "../infrastructure_layer/stations/useStationAvailability";
import { useTripArcsLayer } from "./trips/useTripArcsHook";

/**
 * Custom hook to fetch and process data for the trip flow layer, including station availability and trip arcs.
 * It combines the data from station availability and trip arcs to provide a comprehensive dataset for the trip flow visualization.
 * @param {Object} filters - Optional filters for fetching trip counts, such as date range or user-selected filters.
 * @returns 
 */
export function useTripFlowLayer({ filters }) {
    // Data fetching for station availability and trip arcs
    const { stationData, loading: stationLoading, error: stationError } = useStationAvailability()
    const { trips, maxTripFlow, loading: tripLoading, error: tripError } = useTripArcsLayer({ filters })
    // Combine loading and error states for easier handling in the component
    const loading = stationLoading || tripLoading
    const error = stationError || tripError
    // Return combined data and states for the trip flow layer
    return { trips, maxTripFlow, stations: stationData, loading, error }
}