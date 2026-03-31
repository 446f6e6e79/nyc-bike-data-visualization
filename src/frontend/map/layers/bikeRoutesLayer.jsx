import { GeoJsonLayer } from '@deck.gl/layers'

/**
 * Color map for bike facility classes. *
*/
export const FACILITY_COLORS = {
    I:   [16,  185, 129, 255],   // emerald green
    II:  [37,   99, 235, 255],   // royal blue
    III: [245, 158,  11, 255],   // amber
    _default: [120, 120, 120, 255], // gray for unknown classes
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
    I:   'rgb(16,185,129)',
    II:  'rgb(37,99,235)',
    III: 'rgb(245,158,11)',
    _default: 'rgb(120,120,120)',
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
 * Legend panel — place this in the top-right corner of your map container.
*/
export function bikeRoutesLegend() {
    return (
        <div>
            <h4>Temporary Bike Routes Legend</h4>
        </div>
    )
}