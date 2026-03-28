import { useCallback, useEffect, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { buildLayers } from '../map/buildLayers.jsx'
import MapController from '../map/components/MapController.jsx'
import MapLegend from '../map/components/MapLegend.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import Tooltip from '../map/components/Tooltip.jsx'

// List of available map layers
export const LAYER_OPTIONS = [
    { value: 'station_usage', hasAnimation: true, label: 'Station usage' },
    { value: 'trip_flow', hasAnimation: false, label: 'Trip flow' },
    { value: 'station_availability', hasAnimation: false, label: 'Station availability' }
    // Future layers can be added here
]
// Map styles for the base tile layer
export const MAP_STYLES = {
  light: 'https://a.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png',
  dark: 'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
}
// Initial view state centered on NYC
const INITIAL_VIEW_STATE = {
  longitude: -73.97,
  latitude: 40.75,
  zoom: 10.8,       // Initial zoom level to show the city
  pitch: 45,        // Map inclination for a 3D effect
  bearing: 0,       // Rotation of the map
}
// Allowed zoom range for map interactions
const MIN_ZOOM = 9
const MAX_ZOOM = 15
// Utility function to clamp a value between a minimum and maximum 
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
// List of available map layers
const MIN_PITCH = 0            // Minimum pitch angle for the map view
const MAX_PITCH = 60           // Maximum pitch angle for the map view (to prevent excessive tilting)

function MapPage({ filters }) {
    //#TODO: Update endpoint filters this is a placeholder for now, it updates but nothing happens
    
    // State for map view (center, zoom, etc.)
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)          // Default view state for NYC, can be adjusted as needed
    const [currentTime, setCurrentTime] = useState(7)                       // Current hour frame (0-23) for animation. Default to 7 AM     
    const [hasAnimation, setHasAnimation] = useState(true)                  // Whether the current layer supports animation
    const [activeLayer, setActiveLayer] = useState('station_usage')         // Currently selected map layer
    const [showBikeRoutes, setShowBikeRoutes] = useState(false)             // Whether to show bike routes on the station availability layer

    // Handler for view map changes
    const handleViewStateChange = useCallback(({ viewState: nextViewState }) => {
        setViewState({
            ...nextViewState,
            zoom: clamp(nextViewState.zoom, MIN_ZOOM, MAX_ZOOM),
            pitch: clamp(nextViewState.pitch, MIN_PITCH, MAX_PITCH),
        })
    }, [])

    // Build layers based on active layer and data
    const { layers, loading, error } = buildLayers({
        filters: filters,
        currentTime,
        activeLayer,
        showBikeRoutes,
        tileUrl: MAP_STYLES.light,
    })

    // Check current active layer for animation capability
    useEffect(() => {
        setHasAnimation(LAYER_OPTIONS.find((layer) => layer.value === activeLayer)?.hasAnimation)
    }, [activeLayer])
    // If there's an error or data is still loading in the active layer, show the status message instead of the map
    if (error || loading) {
        return <StatusMessage loading={loading} error={error} />
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
                getTooltip={({ object }) => Tooltip({ object, activeLayer })}
            />
            <>
                <MapController
                    activeLayer={activeLayer}
                    setActiveLayer={setActiveLayer}
                    currentTime={currentTime}
                    setCurrentTime={setCurrentTime}
                    hasAnimation={hasAnimation}
                    showBikeRoutes={showBikeRoutes}
                    setShowBikeRoutes={setShowBikeRoutes}
                />
                <MapLegend
                    activeLayer={activeLayer}
                    showBikeRoutes={showBikeRoutes}
                />
            </>
        </div>
    )
}

export default MapPage