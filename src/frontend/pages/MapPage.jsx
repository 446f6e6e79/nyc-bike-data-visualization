import { useCallback, useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import useStationRideCounts from '../hooks/useStationRideCounts.js'
import { INITIAL_VIEW_STATE, LIMIT_STATIONS, MAP_STYLES, MAX_ZOOM, MIN_ZOOM, clamp, MIN_PITCH, MAX_PITCH, LAYER_OPTIONS } from '../map/constants.js'
import { buildLayers } from '../map/buildLayers.js'
import { getAverageUsage, getStationForCurrentTime, getMaxUsage, selectStations } from '../map/selectors/stationUsage.js'

import MapController from '../map/components/MapController.jsx'
import MapLegend from '../map/components/MapLegend.jsx'
import StatusMessage from '../components/StatusMessage.jsx'

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

    const timeLabel = `${String(Math.floor(currentTime)).padStart(2, '0')}:
                        ${String(Math.floor((currentTime % 1) * 60)).padStart(2, '0')}`

    // Handler for view map changes
    const handleViewStateChange = useCallback(({ viewState: nextViewState }) => {
        setViewState({
            ...nextViewState,
            zoom: clamp(nextViewState.zoom, MIN_ZOOM, MAX_ZOOM),
            pitch: clamp(nextViewState.pitch, MIN_PITCH, MAX_PITCH),
        })
    }, [])

    // Build the map layers
    const layers = useMemo(
        () =>
            buildLayers({
                stations: frameStations,
                maxUsage,
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
                // TODO: export tooltip function to a separate file
                getTooltip={({ object }) => {
                    if (!object) {
                        return null
                    }

                    if (Array.isArray(object.sourcePosition) && Array.isArray(object.targetPosition)) {
                        const rides = Math.round(Number(object.hourly_rides) || 0)
                        const fromName = object.stationAName ?? 'Station A'
                        const toName = object.stationBName ?? 'Station B'

                        return `Time: ${timeLabel}\nTrip: ${fromName} → ${toName}\nRides: ${rides}`
                    }

                    const points = Array.isArray(object.points) ? object.points : []

                    if (points.length > 0) {
                        const totalUsage = Math.round(
                            points.reduce((sum, point) => sum + (Number(point.usage) || 0), 0)
                        )
                        const uniqueStationIds = [...new Set(points.map((point) => point.stationId).filter(Boolean))]
                        const stationPreview = uniqueStationIds.slice(0, 4).join(', ')
                        const stationSuffix = uniqueStationIds.length > 4 ? ', …' : ''

                        return `Time: ${timeLabel}\nStations: ${points.length}\nUsage: ${totalUsage} rides\nIDs: ${stationPreview}${stationSuffix}`
                    }

                    const totalUsage = Math.round(Number(object.elevationValue ?? object.colorValue ?? 0) || 0)
                    const count = Math.round(Number(object.count ?? 0) || 0)

                    return `Time: ${timeLabel}\nStations: ${count}\nUsage: ${totalUsage} rides`
                }}
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