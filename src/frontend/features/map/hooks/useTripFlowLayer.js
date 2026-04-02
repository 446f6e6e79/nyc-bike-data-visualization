import { useMemo } from 'react'
import {
    selectTrips,
    selectMaxFlow,
} from '../utils/selectors/tripFlow.js'
import useTripCounts from './useTripCounts.js'
import { LIMIT_TRIPS } from '../../../config.jsx'

/**
 * Custom hook to fetch and process trip flow data for the trip flow layer.
 * It retrieves trip counts, filters them based on the date range, and calculates the maximum flow for scaling purposes.
 * @param {Object} userFilters - Optional filters for fetching trip counts, such as date range or user-selected filters.
 * @returns {Object} An object containing the filtered trip data, maximum flow value, loading state, and error state.
 */
export function useTripFlowLayer({ filters }) {
    // Build filters for trip count data
    const tripCountFilters = {
        limit: LIMIT_TRIPS,
        ...(filters ?? {})
    }

    // Fetch trip count data for the current date range.
    const { tripCount,
        loading: loading,
        error: error
    } = useTripCounts(tripCountFilters)

    // Process trip data to get the trips and calculate the maximum flow for scaling
    const trips = useMemo(() => selectTrips(tripCount), [tripCount])
    const maxTripFlow = useMemo(() => selectMaxFlow(tripCount), [tripCount])

    return { trips, maxTripFlow, loading, error}
}
