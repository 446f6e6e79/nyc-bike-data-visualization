import { ScatterplotLayer } from "@deck.gl/layers";
import {
    INK_MUTED_RGB,
    WARM_HIGHLIGHT_RGB,
} from "../../../../../utils/editorialTokens.js";

const STATION_COLOR_DEFAULT = INK_MUTED_RGB;
const STATION_COLOR_SELECTED = WARM_HIGHLIGHT_RGB;

const STATION_RADIUS_BASE = 24;
const STATION_RADIUS_HOVER_MULTIPLIER = 2;
const STATION_RADIUS_MAX = 160;

const STATION_PICK_RADIUS_MULTIPLIER = 3.5;
const STATION_PICK_RADIUS_MAX = 160;

function getVisualRadius(d, hoveredStationId) {
    const base = STATION_RADIUS_BASE;
    if (d.id !== hoveredStationId) return base;
    return Math.min(base * STATION_RADIUS_HOVER_MULTIPLIER, STATION_RADIUS_MAX);
}

export function createTripStationsLayer({
    stations,
    selectedStationIds = [],
    hoveredStationId = null,
    onStationPick,
    onStationHover,
}) {
    const selectedStationIdSet = new Set(selectedStationIds);

    return new ScatterplotLayer({
        id: "trip-flow-stations-layer",
        data: stations,
        getPosition: (d) => [d.longitude, d.latitude],
        getRadius: (d) => getVisualRadius(d, hoveredStationId),
        getFillColor: (d) =>
            selectedStationIdSet.has(d.id) || d.id === hoveredStationId
                ? STATION_COLOR_SELECTED
                : STATION_COLOR_DEFAULT,
        getLineColor: [255, 255, 255],
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        radiusUnits: "meters",
        radiusMinPixels: 4,
        radiusMaxPixels: 110,
        pickable: false,
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
    });
}

export function createTripStationsHitLayer({
    stations,
    hoveredStationId = null,
    onStationPick,
    onStationHover,
}) {
    return new ScatterplotLayer({
        id: "trip-flow-stations-layer-hit",
        data: stations,
        getPosition: (d) => [d.longitude, d.latitude],
        getRadius: (d) => {
            const visualRadius = getVisualRadius(d, hoveredStationId);
            return Math.min(
                visualRadius * STATION_PICK_RADIUS_MULTIPLIER, STATION_PICK_RADIUS_MAX,
            );
        },
        getFillColor: [0, 0, 0, 0],
        stroked: false,
        filled: true,
        radiusUnits: "meters",
        radiusMinPixels: 15,
        radiusMaxPixels: 140,
        pickable: true,
        onClick: onStationPick,
        onHover: onStationHover,
        updateTriggers: {
            getRadius: [hoveredStationId],
        },
        parameters: {
            depthTest: false,
        },
    });
}

export function tripStationTooltip(object) {
    return object?.name ?? "Unknown Station";
}
