import { ScatterplotLayer } from '@deck.gl/layers'
import {
    INK_MUTED_RGB,
    WARM_HIGHLIGHT_RGB,
} from '../../../../../utils/editorialTokens.js'

// Default stations recede to quiet ink-muted dots so the colored arcs carry
// the narrative; selected stations share the warm highlight of their arcs
// so the click target and its connections read as one visual group.
const STATION_COLOR_DEFAULT = INK_MUTED_RGB       // [110, 106, 98]
const STATION_COLOR_SELECTED = WARM_HIGHLIGHT_RGB // [229, 140, 43]
const STATION_RADIUS_BASE = 24
const STATION_RADIUS_HOVER_MULTIPLIER = 2
const STATION_RADIUS_MAX = 140

/**
 * Creates a scatterplot layer for displaying all available stations as blue dots in trip flow view.
 * @param {Array} stations - Array of station objects with latitude, longitude, and optional capacity
 * @param {string[]} selectedStationIds - Station identifiers currently selected by click.
 * @param {Function} onStationPick - Click handler for station points.
 * @returns {ScatterplotLayer}
 */
export function createTripStationsLayer({
    stations,
    selectedStationIds = [],
    hoveredStationId = null,
    onStationPick,
    onStationHover,
}) {
    const selectedStationIdSet = new Set(selectedStationIds)
    const getBaseRadius = () => STATION_RADIUS_BASE

    return new ScatterplotLayer({
        id: 'trip-flow-stations-layer',
        data: stations,
        getPosition: (d) => [d.longitude, d.latitude],
        getRadius: (d) => {
            const baseRadius = getBaseRadius(d)
            if (d.id !== hoveredStationId) return baseRadius
            return Math.min(baseRadius * STATION_RADIUS_HOVER_MULTIPLIER, STATION_RADIUS_MAX)
        },
        getFillColor: (d) => (selectedStationIdSet.has(d.id) || d.id === hoveredStationId)
            ? STATION_COLOR_SELECTED
            : STATION_COLOR_DEFAULT,
        getLineColor: [255, 255, 255],
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        radiusUnits: 'meters',
        radiusMinPixels: 4,
        radiusMaxPixels: 60,
        pickingRadius: 12,
        pickable: true,
        onClick: onStationPick,
        onHover: onStationHover,
        transitions: {
            getRadius: {
                duration: 220,
                easing: (t) => t * t * (3 - 2 * t),
            },
            getFillColor: {
                duration: 180,
            },
        },
        updateTriggers: {
            getFillColor: [selectedStationIds, hoveredStationId],
            getRadius: [hoveredStationId],
        },
    })
}

export function tripStationTooltip(object) {
    return `Station: ${object.name}` ?? 'Unknown Station'
}