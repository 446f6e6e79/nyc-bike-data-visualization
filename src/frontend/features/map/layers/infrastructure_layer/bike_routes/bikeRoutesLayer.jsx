import { GeoJsonLayer } from '@deck.gl/layers'

/**
 * Color map for bike facility classes — editorial palette.
 * Three clearly distinct hues, each carrying implicit meaning:
 * forest = segregated/safe, accent = primary network, amber = shared/caution.
 */
export const FACILITY_COLORS = {
    I:   [ 47, 125,  79, 255],   // forest — off-street path
    II:  [ 25,  83, 216, 255],   // accent — dedicated lane
    III: [200, 138,  26, 255],   // amber  — signed shared
    _default: [110, 106, 98, 255], // ink-muted — unknown
}

/**
 * Human-readable labels for each facility class.
 */
export const FACILITY_LABELS = {
    I:   'Off-street Path',
    II:  'Dedicated Lane',
    III: 'Signed Shared Lane',
    _default: 'Unknown'
}

/**
 * CSS-friendly color strings, mirrored from FACILITY_COLORS — used by the
 * React legend component only (no deck.gl involvement).
*/
export const FACILITY_CSS_COLORS = {
    I:   'rgb(47, 125, 79)',
    II:  'rgb(25, 83, 216)',
    III: 'rgb(200, 138, 26)',
    _default: 'rgb(110, 106, 98)',
}

/** Line widths (pixels) per class, for deck.gl getLineWidth. */
const LINE_WIDTH = 5

/**
 * Builds the GeoJSON line layer for bike routes.
 * @param {Array}    routes         - Array of GeoJSON Feature objects.
 * @param {number|null} hoveredrouteID - The routeID of the currently hovered route segment, or null if none.
 * @param {function} onRoutePick    - Callback function to handle hover/click events on route segments.
 * @returns {GeoJsonLayer|null}
 */
export function createBikeRoutesLayer({ routes, hoveredrouteID, onRoutePick }) {
    // To prevent rendering an empty layer, return null if there are no routes
    if (!routes?.length) return null
    return new GeoJsonLayer({
        id: 'bike-routes-line-layer',
        data: routes,
        stroked: true,  
        filled: false,  // No fill, just stroke
        // Line width definition
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: LINE_WIDTH,
        lineWidthMaxPixels: LINE_WIDTH,
        // Line color: highlight every segment sharing the hovered routeID,
        getLineColor: (f) => {
            const base = FACILITY_COLORS[f.facilityClass] ?? FACILITY_COLORS._default
            if (hoveredrouteID == null) return base
            return f.routeID === hoveredrouteID
                ? [255, 255, 255, 255]              // HIGHLIGHTED SEGMENTS
                : [base[0], base[1], base[2], 255] // NOT SELECTED BIKE ROUTES
            // No hover active — normal class-based colour
        },
        // Hover events
        pickable: true,
        autoHighlight: false,   // Manual highlighting via getLineColor above
        onHover: onRoutePick,
        onClick: onRoutePick,
        // Rebuild colour accessor whenever routes data or the hovered id changes
        updateTriggers: {
            getLineColor: [hoveredrouteID],
            getLineWidth: [routes],
        },
    })
}

/**
 * Returns a plain-text tooltip string for a hovered bike route feature.
 * Safe-guards against missing properties.
 *
 * @param {Object} object - The hovered GeoJSON feature (from deck.gl onHover).
 * @returns {string}
 */
export function bikeRouteTooltip(object) {
    // Avoid rendering if empty or malformed feature
    if (!object) return ''
    // Extract relevant properties with safe fallbacks
    const { streetName, facilityClass, fromStreet, toStreet } = object
    // Map facility class to human-readable label, with a fallback for unknown classes
    const classLabel = FACILITY_LABELS[facilityClass] ?? 'Unknown'

    return [
        `Streets: ${streetName}`,
        `${fromStreet} ---> ${toStreet}`,
        `Facility Class:  ${classLabel}`,
    ]
        .filter(Boolean)
        .join('\n')
}

/**
 * Returns the legend entries for the bike-routes layer as plain data.
 * `MapLegend` renders them uniformly alongside every other layer's entries.
 */
export function bikeRoutesLegend() {
    return {
        entries: [
            { swatch: FACILITY_CSS_COLORS.I,   label: FACILITY_LABELS.I },
            { swatch: FACILITY_CSS_COLORS.II,  label: FACILITY_LABELS.II },
            { swatch: FACILITY_CSS_COLORS.III, label: FACILITY_LABELS.III },
        ],
    }
}