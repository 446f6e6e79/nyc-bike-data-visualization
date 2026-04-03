import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { selectTrips, selectMaxFlow } from './tripArcsSelector.js'
import { fetchTripsBetweenStations } from './tripCountsApi.js'
import { LIMIT_TRIPS } from '../../../../../utils/config.jsx'

/**
 * Custom hook to fetch and process trip flow data for the trip flow layer.
 * It retrieves trip counts, filters them based on the date range, and calculates the maximum flow for scaling purposes.
 * @param {Object} filter - Optional filters for fetching trip counts, such as date range or user-selected filters.
 * @param {Array} selectedStationIds - Array of selected station IDs to fetch trip counts for specific stations.
 * @returns {Object} An object containing the filtered trip data, maximum flow value, loading state, and error state.
 */
export function useTripArcsLayer({ filters, selectedStationIds }) {
    // Prepare the base filters for fetching trip counts, including the limit and any additional filters provided by the user
    const baseTripCountFilters = useMemo(
        () => ({
            limit: LIMIT_TRIPS,
            ...(filters ?? {}),
        }),
        [filters],
    )
    // Fetch trip counts for each selected station ID using useQueries for parallel fetching.
    const tripCountQueries = useQueries({
        queries: selectedStationIds.map((stationId) => {
            const stationFilters = {
                ...baseTripCountFilters,
                station_id: stationId,
            }
            return {
                queryKey: ['trips-between-stations', stationFilters],
                queryFn: () => fetchTripsBetweenStations(stationFilters),            }
        }),
    })
    // Combine and process the trip count data from all queries
    const tripCount = useMemo(() => {
        // If no stations are selected, return an empty array to avoid unnecessary processing
        if (!selectedStationIds.length) return []
        // Use a Map to combine trip counts from different queries while avoiding duplicates based on station pairs
        const pairMap = new Map()
        // Iterate through each query's data and populate the pairMap with unique station pairs and their corresponding trip counts
        for (const query of tripCountQueries) {
            const rows = Array.isArray(query.data) ? query.data : []
            for (const row of rows) {
                const pairKey = `${row.station_a_id}|${row.station_b_id}`
                if (!pairMap.has(pairKey)) pairMap.set(pairKey, row)
            }
        }
        return Array.from(pairMap.values())
    }, [tripCountQueries, selectedStationIds.length])
    // Determine the loading state by checking if any of the queries are still loading or fetching
    //#TODO: For now placeholder for new loading component
    const loading = false//tripCountQueries.some((query) => query.isLoading || query.isFetching)
    const error = tripCountQueries.find((query) => query.error)?.error || null
    // Process the combined trip count data to select trips that meet the criteria and calculate the maximum flow for scaling the visualization
    const trips = useMemo(() => selectTrips(tripCount), [tripCount])
    const maxTripFlow = useMemo(() => (trips.length > 0 ? selectMaxFlow(trips) : 0), [trips])

    return { trips, maxTripFlow, loading, error }
}
