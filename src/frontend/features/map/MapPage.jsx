import DeckGL from '@deck.gl/react'
import { useMapHandler } from './hooks/useMapHandler.js'
import { useBuildLayers } from './hooks/useBuildLayers.js'
import MapController from './components/MapController.jsx'
import MapLegend from './components/MapLegend.jsx'
import StatusMessage from '../../components/StatusMessage.jsx'
import Tooltip from './components/Tooltip.jsx'

// List of available map layers
export const LAYER_OPTIONS = [
    { value: 'station_usage', hasAnimation: true, label: 'Station usage' },
    { value: 'trip_flow', hasAnimation: false, label: 'Trip flow' },
    { value: 'infrastructure', hasAnimation: false, label: 'Infrastructure' }
    // Future layers can be added here
]

// Initial view state centered on NYC
export const INITIAL_VIEW_STATE = {
    longitude: -73.97,
    latitude: 40.75,
    zoom: 10.8,
    pitch: 45,
    bearing: 0,
}

// Allowed zoom range for map interactions
export const MIN_ZOOM = 9
export const MAX_ZOOM = 15
// Allowed pitch range for map interactions
export const MIN_PITCH = 0
export const MAX_PITCH = 60

function MapPage({ filters }) {
    // Map handler manages view state, active layer, animation time, and related logic
    const {
        activeLayer,
        controller,
        currentTime,
        handleViewStateChange,
        hasAnimation,
        setActiveLayer,
        setCurrentTime,
        setShowBikeRoutes,
        showBikeRoutes,
        viewState,
    } = useMapHandler()
    // Build the layers to be rendered based on the active layer and fetched data
    const {
        layers,
        loading,
        error,
        resetSelectedStationIds
    } = useBuildLayers({ filters, currentTime, activeLayer, showBikeRoutes })

    return (
        <section className="page-card">
            <header className="page-card__header">
                <div className="page-card__heading">
                    <span className="page-card__eyebrow">Explore</span>
                    <h2 className="page-card__title">NYC Citi Bike Map</h2>
                    <p className="page-card__subtitle">
                        Interactive view of station usage, trip flows, and infrastructure.
                    </p>
                </div>
            </header>
            <div className="page-card__body">
                {(error || loading) ? (
                    <StatusMessage loading={loading} error={error} />
                ) : (
                    <div className="map-shell">
                        <DeckGL
                            viewState={viewState}
                            onViewStateChange={handleViewStateChange}
                            controller={controller}
                            layers={layers}
                            getTooltip={({ object }) => Tooltip({ object, activeLayer })}
                        />
                        <MapController
                            activeLayer={activeLayer}
                            setActiveLayer={setActiveLayer}
                            currentTime={currentTime}
                            setCurrentTime={setCurrentTime}
                            hasAnimation={hasAnimation}
                            showBikeRoutes={showBikeRoutes}
                            setShowBikeRoutes={setShowBikeRoutes}
                            resetSelectedStationIds={resetSelectedStationIds}
                        />
                        <MapLegend
                            activeLayer={activeLayer}
                            showBikeRoutes={showBikeRoutes}
                        />
                    </div>
                )}
            </div>
        </section>
    )
}

export default MapPage
