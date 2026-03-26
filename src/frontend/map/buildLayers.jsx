import { createBaseTileLayer } from './layers/baseTileLayer.js'
import { createStationUsageLayer } from './layers/stationUsageLayer.jsx'
import { createTripFlowLayer } from './layers/tripFlowLayer.jsx'
import { useStationUsageLayer } from './hooks/useStationUsageLayer.jsx'
import { useTripFlowLayer } from './hooks/useTripFlowLayer.jsx'
import { useMemo } from 'react'
import { MAP_STYLES } from '../pages/MapPage.jsx'

/**
 * Function to build the layers for the map based on the active layer and the provided data. 
 * @param {Object} dateRange - Optional date range for filtering data in the layers.
 * @param {number} currentTime - Current hour frame (0-23) for filtering station usage data.
 * @param {string} activeLayer - The currently active map layer to determine which layers to build.
 * @returns {Object} The built layers and their status.
 */
export function buildLayers({ dateRange, currentTime, activeLayer }) {
    // Fetch and process data
    const { frameStations, maxUsage, loading: stationLoading, error: stationError } = useStationUsageLayer({ dateRange, currentTime })
    const { trips, maxTripFlow, loading: tripLoading, error: tripError } = useTripFlowLayer({ dateRange })

    // Combine loading and error states for easier handling in the component
    const stateLayers = [
        { layer: 'station_usage', loading: stationLoading, error: stationError },
        { layer: 'trip_flow', loading: tripLoading, error: tripError }
    ]

    // Build layers based on active layer and data
    const layers = useMemo(() => {
        // Base tile layer is always included
        const base = [createBaseTileLayer(MAP_STYLES.light)]
        // Push the appropriate layer based on the active layer and data loading/error states
        if (activeLayer === 'station_usage') {
            if (!stationLoading && !stationError)
                base.push(createStationUsageLayer({ frameStations, maxUsage }))
        } 
        if (activeLayer === 'trip_flow') {
            if (!tripLoading && !tripError)
                base.push(createTripFlowLayer({ trips, maxTripCount: maxTripFlow }))
        }

        return base
    }, [frameStations, maxUsage, trips, maxTripFlow, activeLayer, stationLoading, stationError, tripLoading, tripError])

    // Consider the loading and error states of only the active layer for the overall status
    const loading = stateLayers.find(layer => layer.layer === activeLayer)?.loading || false
    const error = stateLayers.find(layer => layer.layer === activeLayer)?.error || null
    return {
        layers,
        loading: loading,
        error: error,
    }
}