import { useCallback, useEffect, useState } from 'react'
import { LAYER_OPTIONS, MIN_PITCH, MAX_PITCH, MIN_ZOOM, MAX_ZOOM, INITIAL_VIEW_STATE, MIN_LONGITUDE, MAX_LONGITUDE, MIN_LATITUDE, MAX_LATITUDE } from '../MapPage'

// Utility function to clamp a value between a minimum and maximum
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/**
 * Hook for handling map-related state and logic.
 * @param {Object} param0 - The parameters for the hook.
 * @returns {Object} The map handler functions and state.
 */
export function useMapHandler() {
    // State for map view (center, zoom, etc.)
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
    // Current hour frame (0-23) for animation. Default to 7 AM
    const [currentTime, setCurrentTime] = useState(7)
    // Whether the current layer supports animation
    const [hasAnimation, setHasAnimation] = useState(true)
    // Currently selected map layer
    const [activeLayer, setActiveLayer] = useState('station_usage')
    // Whether to show bike routes on the infrastructure layer
    const [showBikeRoutes, setShowBikeRoutes] = useState(false)

    // Handler for view map changes
    const handleViewStateChange = useCallback(({ viewState: nextViewState }) => {
        setViewState({
            ...nextViewState,
            longitude: clamp(nextViewState.longitude, MIN_LONGITUDE, MAX_LONGITUDE),
            latitude: clamp(nextViewState.latitude, MIN_LATITUDE, MAX_LATITUDE),
            zoom: clamp(nextViewState.zoom, MIN_ZOOM, MAX_ZOOM),
            pitch: clamp(nextViewState.pitch, MIN_PITCH, MAX_PITCH),
        })
    }, [])

    // Check current active layer for animation capability
    useEffect(() => {
        setHasAnimation(LAYER_OPTIONS.find((layer) => layer.value === activeLayer)?.hasAnimation ?? false)
    }, [activeLayer])

    return {
        activeLayer,
        controller: {
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM,
            minPitch: MIN_PITCH,
            maxPitch: MAX_PITCH,
            dragRotate: true,
            touchRotate: true,
        },
        currentTime,
        handleViewStateChange,
        hasAnimation,
        setActiveLayer,
        setCurrentTime,
        setShowBikeRoutes,
        showBikeRoutes,
        viewState,
    }
}