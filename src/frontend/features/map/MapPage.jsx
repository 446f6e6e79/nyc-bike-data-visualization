import DeckGL from '@deck.gl/react'
import { useCallback, useEffect, useState } from 'react'
import { useMapHandler } from './hooks/useMapHandler.js'
import { useBuildLayers } from './hooks/useBuildLayers.js'
import MapController from './components/MapController.jsx'
import MapLegend from './components/MapLegend.jsx'
import LayerSelector from './components/LayerSelector.jsx'
import StatusMessage from '../../components/StatusMessage.jsx'
import Tooltip from './components/Tooltip.jsx'
import VisualizationGuide from '../../components/VisualizationGuide.jsx'

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
export const MIN_ZOOM = 12
export const MAX_ZOOM = 15
// Allowed pitch range for map interactions
export const MIN_PITCH = 0
export const MAX_PITCH = 60

// Clamp bounds for NYC area to keep navigation constrained but still fluid.
export const MIN_LONGITUDE = -74.30
export const MAX_LONGITUDE = -73.65
export const MIN_LATITUDE = 40.45
export const MAX_LATITUDE = 40.95

const POINT_LAYER_ID_PREFIXES = [
    'station-usage-layer',
    'trip-flow-stations-layer',
    'station-availability-layer',
]

const MAP_LAYER_GUIDES = {
    station_usage: {
        mapName: 'Station Usage',
        title: 'How To Read It',
        summary: 'This layer shows how busy each station is during the day. Use it to detect local demand peaks and identify where bike pressure concentrates over time.',
        hints: [
            {
                mapType: 'Station Usage',
                title: 'Follow rush-hour pulses',
                text: 'Drag the time wheel from morning to evening and watch which neighborhoods light up first. This helps separate commute hubs from leisure hotspots.',
            },
            {
                mapType: 'Station Usage',
                title: 'Compare center vs edges',
                text: 'Check if demand stays centralized or spreads outward at different hours. Sudden shifts often reveal directional commuting patterns.',
            },
            {
                mapType: 'Station Usage',
                title: 'Use pause for anomalies',
                text: 'Pause on unusual spikes and inspect nearby stations one by one to see if the pattern is isolated or part of a broader corridor trend.',
            },
        ],
    },
    trip_flow: {
        mapName: 'Trip Flow',
        title: 'How To Read It',
        summary: 'This layer highlights station-to-station movement intensity. Use it to understand directional connectivity and the strongest mobility corridors in the network.',
        hints: [
            {
                mapType: 'Trip Flow',
                title: 'Start from a station',
                text: 'Click a station to isolate its outgoing and incoming links. This quickly reveals whether it behaves as a local feeder or a network hub.',
            },
            {
                mapType: 'Trip Flow',
                title: 'Read thickness as intensity',
                text: 'Heavier arcs indicate stronger relationships between station pairs. Compare multiple links from the same origin before drawing conclusions.',
            },
            {
                mapType: 'Trip Flow',
                title: 'Reset and compare',
                text: 'Use Reset often to avoid tunnel vision. Repeating selection across districts gives a cleaner picture of city-wide flow structure.',
            },
        ],
    },
    infrastructure: {
        mapName: 'Infrastructure',
        title: 'How To Read It',
        summary: 'This layer focuses on station capacity and bike-route context. Use it to evaluate where infrastructure appears balanced or potentially undersized versus demand.',
        hints: [
            {
                mapType: 'Infrastructure',
                title: 'Toggle routes strategically',
                text: 'Enable bike routes to assess whether high-capacity stations are supported by route coverage, then disable to inspect station signals without clutter.',
            },
            {
                mapType: 'Infrastructure',
                title: 'Check capacity clusters',
                text: 'Look for areas where many nearby stations show similar capacity levels. Uniform clusters often reflect planning zones or network hierarchy.',
            },
            {
                mapType: 'Infrastructure',
                title: 'Pair with usage insights',
                text: 'Use this layer after Station usage: places with repeated pressure and modest infrastructure are prime candidates for deeper operational analysis.',
            },
        ],
    },
}

function MapPage({ filters }) {
    const [showInitialLoadingOverlay, setShowInitialLoadingOverlay] = useState(true)
    const [isHoveringPoint, setIsHoveringPoint] = useState(false)

    const handleHover = useCallback(({ object, layer }) => {
        if (!object || !layer?.id) {
            setIsHoveringPoint(false)
            return
        }

        setIsHoveringPoint(
            POINT_LAYER_ID_PREFIXES.some((prefix) => layer.id.startsWith(prefix)),
        )
    }, [])

    const getCursor = useCallback(({ isDragging }) => {
        if (isDragging) return 'grabbing'
        if (isHoveringPoint) return 'pointer'
        return 'grab'
    }, [isHoveringPoint])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setShowInitialLoadingOverlay(false)
        }, 220)

        return () => {
            clearTimeout(timeoutId)
        }
    }, [])

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
        refetch,
        resetSelectedStationIds,
        hasTripFlowSelection,
    } = useBuildLayers({ filters, currentTime, activeLayer, showBikeRoutes })
    const shouldShowMapUi = !error
    const shouldShowMapLegend = !loading && !error
    const hasLayersData = layers.length > 0 && layers.some(layer => Array.isArray(layer.data) && layer.data.length > 0)
    const shouldShowStatusOverlay = showInitialLoadingOverlay || loading || error || !hasLayersData
    const guide = MAP_LAYER_GUIDES[activeLayer] ?? MAP_LAYER_GUIDES.station_usage

    return (
        <section className="page-card">
            <header className="page-card__header">
                <div className="page-card__heading">
                    <span className="page-card__eyebrow">01 — Atlas</span>
                    <h2 className="page-card__title">The city, one ride at a time.</h2>
                    <p className="page-card__subtitle">
                        An interactive read of station usage, trip flows, and cycling
                        infrastructure across the five boroughs.
                    </p>
                </div>
                <div className="page-card__actions">
                    <LayerSelector
                        activeLayer={activeLayer}
                        setActiveLayer={setActiveLayer}
                        disabled={loading}
                    />
                </div>
            </header>
            <div className="page-card__body">
                <div className="map-shell">
                    <DeckGL
                        viewState={viewState}
                        onViewStateChange={handleViewStateChange}
                        controller={controller}
                        layers={layers}
                        onHover={handleHover}
                        getCursor={getCursor}
                        getTooltip={({ object }) => Tooltip({ object, activeLayer })}
                    />
                    {shouldShowMapUi && (
                        <MapController
                            activeLayer={activeLayer}
                            currentTime={currentTime}
                            setCurrentTime={setCurrentTime}
                            hasAnimation={hasAnimation}
                            showBikeRoutes={showBikeRoutes}
                            setShowBikeRoutes={setShowBikeRoutes}
                            resetSelectedStationIds={resetSelectedStationIds}
                            hasTripFlowSelection={hasTripFlowSelection}
                            disabled={loading}
                        />
                    )}
                    {shouldShowMapLegend && (
                        <MapLegend
                            activeLayer={activeLayer}
                            showBikeRoutes={showBikeRoutes}
                        />
                    )}
                    {shouldShowStatusOverlay && (
                        <StatusMessage
                            loading={showInitialLoadingOverlay || loading}
                            error={error}
                            onRefetch={refetch}
                        />
                    )}
                </div>

                <VisualizationGuide
                    mapName={guide.mapName}
                    title={guide.title}
                    summary={guide.summary}
                    hints={guide.hints}
                />
            </div>
        </section>
    )
}

export default MapPage
