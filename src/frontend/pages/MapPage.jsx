import { useCallback, useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import useStationRideCounts from '../hooks/useStationRideCounts.js'
import { INITIAL_VIEW_STATE, LIMIT_STATIONS, MAP_STYLES, MAX_ZOOM, MIN_ZOOM, clamp, HOURS_IN_DAY, BASE_FRAME_MS, MIN_PITCH, MAX_PITCH, SPEED_OPTIONS } from '../map/constants.js'
import { buildLayers } from '../map/buildLayers.js'
import { getAverageUsage, getStationsForHour, getMaxUsage, selectStations } from '../map/selectors/stationUsage.js'

import MapController from '../map/components/MapController.jsx'
import MapLegend from '../map/components/MapLegend.jsx'
import StatusMessage from '../components/StatusMessage.jsx'

function MapPage({ dateRange }) {
    // State for map view (center, zoom, etc.)
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)        // Default view state for NYC, can be adjusted as needed
    const [currentHour, setCurrentHour] = useState(7)                     // Current hour frame (0-23) for animation. Default to 7 AM     
    const [isPlaying, setIsPlaying] = useState(false)                     // Whether the hourly animation is playing or paused
    const [speed, setSpeed] = useState(1)                                 // Animation speed multiplier (1x, 2x, etc.). Default to 1x
    const [activeLayer, setActiveLayer] = useState('station_usage')       // Active layer to display

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
    const frameStations = useMemo(() => getStationsForHour(stations, currentHour), [stations, currentHour])
    const maxUsage = useMemo(() => getMaxUsage(stations), [stations])
    const avgUsage = useMemo(() => getAverageUsage(frameStations), [frameStations])

    // Count of stations in the current hour frame
    const activeFrameCount = frameStations.length
    const hourLabel = `${String(currentHour).padStart(2, '0')}:00`

    // Animation effect
    //TODO: export this logic to a custom 
    useEffect(() => {
        if (!isPlaying || stationLoading || activeFrameCount === 0) {
            return undefined
        }

        const intervalId = window.setInterval(() => {
            setCurrentHour((hour) => (hour + 1) % HOURS_IN_DAY)
        }, BASE_FRAME_MS / speed)

        return () => window.clearInterval(intervalId)
    }, [isPlaying, stationLoading, activeFrameCount, speed])

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
    // Logs for debugging layers 
    useEffect(() => {
        console.log('Built layers:', layers)
    }, [layers])
    // Aggregate error state
    const overallError = useMemo(() => stationError, [stationError])

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

                        return `Hour: ${hourLabel}\nTrip: ${fromName} → ${toName}\nRides: ${rides}`
                    }

                    const points = Array.isArray(object.points) ? object.points : []

                    if (points.length > 0) {
                        const totalUsage = Math.round(
                            points.reduce((sum, point) => sum + (Number(point.hourly_usage) || 0), 0)
                        )
                        const uniqueStationIds = [...new Set(points.map((point) => point.stationId).filter(Boolean))]
                        const stationPreview = uniqueStationIds.slice(0, 4).join(', ')
                        const stationSuffix = uniqueStationIds.length > 4 ? ', …' : ''

                        return `Hour: ${hourLabel}\nStations: ${points.length}\nUsage: ${totalUsage} rides\nIDs: ${stationPreview}${stationSuffix}`
                    }

                    const totalUsage = Math.round(Number(object.elevationValue ?? object.colorValue ?? 0) || 0)
                    const count = Math.round(Number(object.count ?? 0) || 0)

                    return `Hour: ${hourLabel}\nStations: ${count}\nUsage: ${totalUsage} rides`
                }}
            />
            {!stationLoading && activeFrameCount > 0 && (
                <MapController
                    layers={layers}
                    setIsPlaying={setIsPlaying}
                    isPlaying={isPlaying}
                    speed={speed}
                    setSpeed={setSpeed}
                    activeLayer={activeLayer}
                    setActiveLayer={setActiveLayer}
                    hourLabel={hourLabel}
                />
            )}
            {!stationLoading && activeFrameCount > 0 && (
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