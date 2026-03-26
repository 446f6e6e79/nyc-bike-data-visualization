import { useCallback, useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import useStationRideCounts from '../hooks/useStationRideCounts.js'
import { INITIAL_VIEW_STATE, LIMIT_STATIONS, MAP_STYLES, MAX_ZOOM, MIN_ZOOM, clamp, MIN_PITCH, MAX_PITCH, LAYER_OPTIONS } from '../map/constants.js'
import { buildLayers } from '../map/buildLayers.js'
import { getAverageUsage, getStationForCurrentTime, getMaxUsage, selectStations } from '../map/selectors/stationUsage.js'

import MapController from '../map/components/MapController.jsx'
import MapLegend from '../map/components/MapLegend.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import Tooltip from '../map/components/Tooltip.jsx'

function MapPage({ dateRange }) {
    // State for map view (center, zoom, etc.)
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)          // Default view state for NYC, can be adjusted as needed
    const [currentTime, setCurrentTime] = useState(7)                       // Current hour frame (0-23) for animation. Default to 7 AM     
    const [hasAnimation, setHasAnimation] = useState(true)                  // Whether the current layer supports animation
    const [activeLayer, setActiveLayer] = useState('station_usage')         // Currently selected map layer

    // Build filters for station usage data
    const stationFilters = {
        limit: LIMIT_STATIONS,
        group_by: 'hour',
        ...(dateRange ?? {})
    }

    // Fetch station ride counts with the specified filters using the custom hook
    const { stationRideCounts,
        loading: stationLoading,
        error: stationError
    } = useStationRideCounts(stationFilters)

    // Station Selectors
    const stations = useMemo(() => selectStations(stationRideCounts), [stationRideCounts])
    const frameStations = useMemo(() => getStationForCurrentTime(stations, currentTime), [stations, currentTime])
    const maxUsage = useMemo(() => getMaxUsage(stations), [stations])
    const avgUsage = useMemo(() => getAverageUsage(frameStations), [frameStations])

    // Handler for view map changes
    const handleViewStateChange = useCallback(({ viewState: nextViewState }) => {
        setViewState({
            ...nextViewState,
            zoom: clamp(nextViewState.zoom, MIN_ZOOM, MAX_ZOOM),
            pitch: clamp(nextViewState.pitch, MIN_PITCH, MAX_PITCH),
        })
    }, [])
    // TODO: export this handler to a separate file. Add trips and max trip count
    const layers = useMemo(
        () =>
            buildLayers({
                stations: frameStations,
                trips: [], // Placeholder for trip data, to be implemented in the future
                maxStationUsage: maxUsage,
                maxTripCount: 1, // Placeholder for max trip count, to be implemented in the future
                activeLayer,
                tileUrl: MAP_STYLES.light,
            }),
        [frameStations, maxUsage, activeLayer]
    )

    // Check current active layer for animation capability
    useEffect(() => {
        setHasAnimation(LAYER_OPTIONS.find((layer) => layer.value === activeLayer)?.hasAnimation)
    }, [activeLayer])

    // Aggregate error state
    const overallError = useMemo(() => 
        stationError, 
    [stationError])

    // Aggregate loading state
    const overallLoading = useMemo(() => 
        stationLoading, 
    [stationLoading])

    if (overallError) {
        return <StatusMessage loading={overallLoading} error={overallError} />
    }

    return (
        <div className="map-shell">
            <DeckGL
                viewState={viewState}
                onViewStateChange={handleViewStateChange}
                controller={{
                    minZoom: MIN_ZOOM,
                    maxZoom: MAX_ZOOM,
                    minPitch: MIN_PITCH,
                    maxPitch: MAX_PITCH,
                    dragRotate: true,
                    touchRotate: true,
                }}
                layers={layers}
                getTooltip={({ object }) => Tooltip({ object })}
            />
            {!stationLoading && (
                <MapController
                    activeLayer={activeLayer}
                    setActiveLayer={setActiveLayer}
                    currentTime={currentTime}
                    setCurrentTime={setCurrentTime}
                    hasAnimation={hasAnimation}
                />
            )}
            {!stationLoading && (
                <MapLegend
                    activeLayer={activeLayer}
                    frameStations={frameStations}
                    avgUsage={avgUsage}
                />
            )}
            {(stationLoading) && <div className="map-overlay">Loading map data…</div>}
        </div>
    )
}

export default MapPage