import { useMemo } from 'react'
import {
    selectStationAvailability,
} from './stations/stationAvailabilitySelector.js'
import useStationAvailability from './stations/useStationAvailability.js'
import useBikeRoutes from './bike_routes/useBikeRoutes.js'

/**
 *  Custom hook to provide combined data for station availability and bike routes.
 *  This allows the map component to easily access both datasets and their loading/error states.
 * @param {boolean} showBikeRoutes - Whether to include bike route data in the returned object.
 * @returns 
 */
export function useInfrastructureLayer({ showBikeRoutes = false } = {}) {
    const { stationData, loading: stationsLoading, error: stationsError } = useStationAvailability()
    const { bikeRoutes, loading: routesLoading, error: routesError } = useBikeRoutes()

    const stations = useMemo(() => selectStationAvailability(stationData), [stationData])

    // Combine loading/error: if routes are toggled off, their state is irrelevant
    const loading = stationsLoading || (showBikeRoutes && routesLoading)
    const error = stationsError || (showBikeRoutes ? routesError : null)

    return {
        stations,
        bikeRoutes: showBikeRoutes ? bikeRoutes : [],   // Only provide routes if requested, more efficient for components that don't need them
        loading,
        error,
    }
}