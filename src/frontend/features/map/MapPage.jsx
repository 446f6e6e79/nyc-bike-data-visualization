import DeckGL from '@deck.gl/react'
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
export const MIN_ZOOM = 10
export const MAX_ZOOM = 15
// Allowed pitch range for map interactions
export const MIN_PITCH = 0
export const MAX_PITCH = 60

export const MIN_LONGITUDE = -73.98
export const MAX_LONGITUDE = -73.96
export const MIN_LATITUDE = 40.67
export const MAX_LATITUDE = 40.84

const MAP_LAYER_GUIDES = {
    station_usage: {
        mapName: 'Station Usage Map',
        title: 'How To Read It',
        summary: 'This layer shows how busy each station is during the day. Use it to detect local demand peaks and identify where bike pressure concentrates over time.',
        hints: [
            {
                mapType: 'Station Usage Map',
                title: 'Follow rush-hour pulses',
                text: 'Drag the time wheel from morning to evening and watch which neighborhoods light up first. This helps separate commute hubs from leisure hotspots.',
            },
            {
                mapType: 'Station Usage Map',
                title: 'Compare center vs edges',
                text: 'Check if demand stays centralized or spreads outward at different hours. Sudden shifts often reveal directional commuting patterns.',
            },
            {
                mapType: 'Station Usage Map',
                title: 'Use pause for anomalies',
                text: 'Pause on unusual spikes and inspect nearby stations one by one to see if the pattern is isolated or part of a broader corridor trend.',
            },
        ],
    },
    trip_flow: {
        mapName: 'Trip Flow Map',
        title: 'How To Read It',
        summary: 'This layer highlights station-to-station movement intensity. Use it to understand directional connectivity and the strongest mobility corridors in the network.',
        hints: [
            {
                mapType: 'Trip Flow Map',
                title: 'Start from a station',
                text: 'Click a station to isolate its outgoing and incoming links. This quickly reveals whether it behaves as a local feeder or a network hub.',
            },
            {
                mapType: 'Trip Flow Map',
                title: 'Read thickness as intensity',
                text: 'Heavier arcs indicate stronger relationships between station pairs. Compare multiple links from the same origin before drawing conclusions.',
            },
            {
                mapType: 'Trip Flow Map',
                title: 'Reset and compare',
                text: 'Use Reset often to avoid tunnel vision. Repeating selection across districts gives a cleaner picture of city-wide flow structure.',
            },
        ],
    },
    infrastructure: {
        mapName: 'Infrastructure Map',
        title: 'How To Read It',
        summary: 'This layer focuses on station capacity and bike-route context. Use it to evaluate where infrastructure appears balanced or potentially undersized versus demand.',
        hints: [
            {
                mapType: 'Infrastructure Map',
                title: 'Toggle routes strategically',
                text: 'Enable bike routes to assess whether high-capacity stations are supported by route coverage, then disable to inspect station signals without clutter.',
            },
            {
                mapType: 'Infrastructure Map',
                title: 'Check capacity clusters',
                text: 'Look for areas where many nearby stations show similar capacity levels. Uniform clusters often reflect planning zones or network hierarchy.',
            },
            {
                mapType: 'Infrastructure Map',
                title: 'Pair with usage insights',
                text: 'Use this layer after Station usage: places with repeated pressure and modest infrastructure are prime candidates for deeper operational analysis.',
            },
        ],
    },
}

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
        refetch,
        resetSelectedStationIds
    } = useBuildLayers({ filters, currentTime, activeLayer, showBikeRoutes })
    const shouldShowMapUi = !loading && !error
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
                        />
                    )}
                    {shouldShowMapUi && (
                        <MapLegend
                            activeLayer={activeLayer}
                            showBikeRoutes={showBikeRoutes}
                        />
                    )}
                    {(error || loading) && <StatusMessage loading={loading} error={error} onRefetch={refetch} />}
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
