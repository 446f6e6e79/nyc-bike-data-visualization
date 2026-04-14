// Base Layer
import { createBaseTileLayer } from '../layers/base_layer/baseTileLayer.js'
// Station Usage Layer
import { createStationUsageLayer } from '../layers/station_usage_layer/stationUsageLayer.jsx'
import { useStationUsageLayer } from '../layers/station_usage_layer/useStationUsageHook.js'
// Trip Flow Layer
import { createTripFlowLayers } from '../layers/trip_flow_layer/tripFlowLayer.jsx'
import { useTripFlowLayer } from '../layers/trip_flow_layer/useTripFlowHook.js'
import { useTripStationSelection } from '../layers/trip_flow_layer/stations/useTripStationSelection.js'
// Infrastructure Layerimport { createStationAvailabilityLayer } from '../layers/infrastructure_layer/stations/stationAvailabilityLayer.jsx'

import { createStationAvailabilityLayer } from '../layers/infrastructure_layer/stations/stationAvailabilityLayer.jsx'
import { createBikeRoutesLayer } from '../layers/infrastructure_layer/bike_routes/bikeRoutesLayer.jsx'
import { useInfrastructureLayer } from '../layers/infrastructure_layer/useInfrastructureHook.js'

import { useMemo, useState } from 'react'

// CartoDB Positron — subdued paper/grey basemap that lets the data layers carry
// the color weight. Same provider as Voyager, no API key required.
const BASE_TILE_URL = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'

/**
 * Function to build the layers for the map based on the active layer and the provided data. 
 * @param {Object} filters - Optional filters for fetching data, such as date range or user-selected filters.
 * @param {number} currentTime - Current hour frame (0-23) for filtering station usage data.
 * @param {string} activeLayer - The currently active map layer to determine which layers to build.
 * @returns {Object} The built layers and their status.
 */
export function useBuildLayers({ filters, currentTime, activeLayer, showBikeRoutes }) {
    // Fetch and process data
    const { frameStations, maxUsage, maxDelta, loading: stationLoading, error: stationError, refetch: stationRefetch } = useStationUsageLayer({ filters: filters, currentTime })
    const { selectedStationIds, onStationPick, resetSelectedStationIds } = useTripStationSelection() // Manage station selection state for trip flow layer
    const { trips, maxTripFlow, stations: tripStations, loading: tripLoading, error: tripError, refetch: tripRefetch } = useTripFlowLayer({ filters, selectedStationIds })
    const { stations, bikeRoutes, loading: availabilityLoading, error: availabilityError, refetch: availabilityRefetch } = useInfrastructureLayer({ showBikeRoutes })
    // State for hovered bike route segment
    const [hoveredrouteID, setHoveredrouteID] = useState(null)
    const handleRoutePick = (info) => {
        const route = info?.object
        setHoveredrouteID(route?.routeID ?? route?.properties?.routeID ?? null)
    }

    // Combine loading and error states for easier handling in the component
    const stateLayers = [
        { layer: 'station_usage', loading: stationLoading, error: stationError, refetch: stationRefetch },
        { layer: 'trip_flow', loading: tripLoading, error: tripError, refetch: tripRefetch },
        { layer: 'infrastructure', loading: availabilityLoading, error: availabilityError, refetch: availabilityRefetch }
    ]

    // Build layers based on active layer and data
    const layers = useMemo(() => {
        // Base tile layer is always included
        const base = [createBaseTileLayer(BASE_TILE_URL)]
        // Push the appropriate layer based on the active layer and data loading/error states
        if (activeLayer === 'station_usage') {
            if (!stationLoading && !stationError)
                base.push(createStationUsageLayer({ frameStations, maxUsage, maxDelta }))
        } 
        if (activeLayer === 'trip_flow') {
            if (!tripLoading && !tripError) {
                base.push(createTripFlowLayers({
                    trips,
                    maxTripCount: maxTripFlow,
                    stations: tripStations,
                    selectedStationIds,
                    onStationPick,
                }))
            }
        }
        if (activeLayer === 'infrastructure') {
            if (!availabilityLoading && !availabilityError)
                if (showBikeRoutes && bikeRoutes.length > 0) {
                    base.push(createBikeRoutesLayer({ routes: bikeRoutes, hoveredrouteID: hoveredrouteID, onRoutePick: handleRoutePick }))
                }
                base.push(createStationAvailabilityLayer({ stations: stations }))
        }

        return base
    }, [frameStations, maxUsage, maxDelta, trips, maxTripFlow, tripStations, selectedStationIds, onStationPick, stations, activeLayer, stationLoading, stationError, tripLoading, tripError, availabilityLoading, availabilityError, bikeRoutes, showBikeRoutes, hoveredrouteID])

    // Consider the loading and error states of only the active layer for the overall status
    const loading = stateLayers.find(layer => layer.layer === activeLayer)?.loading || false
    const error = stateLayers.find(layer => layer.layer === activeLayer)?.error || null
    const refetch = stateLayers.find(layer => layer.layer === activeLayer)?.refetch ?? (() => {})
    return {
        layers,
        loading: loading,
        error: error,
        refetch,
        resetSelectedStationIds,
    }
}