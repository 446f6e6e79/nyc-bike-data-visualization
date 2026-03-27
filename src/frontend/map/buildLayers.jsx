// Base Layer
import { createBaseTileLayer } from './layers/baseTileLayer.js'
// Station Usage Layer
import { createStationUsageLayer } from './layers/stationUsageLayer.jsx'
import { useStationUsageLayer } from './hooks/useStationUsageLayer.jsx'
// Trip Flow Layer
import { createTripFlowLayer } from './layers/tripFlowLayer.jsx'
import { useTripFlowLayer } from './hooks/useTripFlowLayer.jsx'
// Station Availability Layer
import { createStationAvailabilityLayer } from './layers/stationAvailabilityLayer.jsx'
import { useStationAvailabilityLayer } from './hooks/useStationAvailabilityLayer.jsx'

import { useMemo } from 'react'
import { MAP_STYLES } from '../pages/MapPage.jsx'

/**
 * Function to build the layers for the map based on the active layer and the provided data. 
 * @param {Object} filters - Optional filters for fetching data, such as date range or user-selected filters.
 * @param {number} currentTime - Current hour frame (0-23) for filtering station usage data.
 * @param {string} activeLayer - The currently active map layer to determine which layers to build.
 * @returns {Object} The built layers and their status.
 */
export function buildLayers({ filters, currentTime, activeLayer }) {
    // Fetch and process data
    const { frameStations, maxUsage, maxDelta,loading: stationLoading, error: stationError } = useStationUsageLayer({ filters: filters, currentTime })
    const { trips, maxTripFlow, loading: tripLoading, error: tripError } = useTripFlowLayer({ filters: filters })
    const { stations, loading: availabilityLoading, error: availabilityError } = useStationAvailabilityLayer()

    // Combine loading and error states for easier handling in the component
    const stateLayers = [
        { layer: 'station_usage', loading: stationLoading, error: stationError },
        { layer: 'trip_flow', loading: tripLoading, error: tripError },
        { layer: 'station_availability', loading: availabilityLoading, error: availabilityError }
    ]

    // Build layers based on active layer and data
    const layers = useMemo(() => {
        // Base tile layer is always included
        const base = [createBaseTileLayer(MAP_STYLES.light)]
        // Push the appropriate layer based on the active layer and data loading/error states
        if (activeLayer === 'station_usage') {
            if (!stationLoading && !stationError)
                base.push(createStationUsageLayer({ frameStations, maxUsage, maxDelta }))
        } 
        if (activeLayer === 'trip_flow') {
            if (!tripLoading && !tripError)
                base.push(createTripFlowLayer({ trips, maxTripCount: maxTripFlow }))
        }
        if (activeLayer === 'station_availability') {
            if (!availabilityLoading && !availabilityError)
                base.push(createStationAvailabilityLayer({ stations: stations }))
        }

        return base
    }, [frameStations, maxUsage, trips, maxTripFlow, stations, activeLayer, stationLoading, stationError, tripLoading, tripError, availabilityLoading, availabilityError])

    // Consider the loading and error states of only the active layer for the overall status
    const loading = stateLayers.find(layer => layer.layer === activeLayer)?.loading || false
    const error = stateLayers.find(layer => layer.layer === activeLayer)?.error || null
    return {
        layers,
        loading: loading,
        error: error,
    }
}