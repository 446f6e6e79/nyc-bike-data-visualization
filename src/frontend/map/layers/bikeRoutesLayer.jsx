import { GeoJsonLayer } from '@deck.gl/layers'

/**
 * Color map for bike facility classes. *
*/
export const FACILITY_COLORS = {
    I:   [16,  185, 129, 255],   // emerald green
    II:  [37,   99, 235, 255],   // royal blue
    III: [245, 158,  11, 255],   // amber
    IV:  [13,  148, 136, 255],   // teal
}

/**
 * Human-readable labels for each facility class.
 */
export const FACILITY_LABELS = {
    I:   'Protected Path',
    II:  'Bike Lane',
    III: 'Shared Lane',
    IV:  'Greenway',
}

/**
 * CSS-friendly color strings, mirrored from FACILITY_COLORS — used by the
 * React legend component only (no deck.gl involvement).
*/
export const FACILITY_CSS_COLORS = {
    I:   'rgb(16,185,129)',
    II:  'rgb(37,99,235)',
    III: 'rgb(245,158,11)',
    IV:  'rgb(13,148,136)',
    _default: 'rgb(120,120,120)',
}

/** Line widths (metres) per class, for deck.gl getLineWidth. */
const LINE_WIDTH = 5

/**
 * Builds the GeoJSON line layer for bike routes.
 * @param {Array}    routes         - Array of GeoJSON Feature objects.
 * @param {Function} [onHover]      - Callback for hover events.
 * @returns {GeoJsonLayer|null}
 */
export function createBikeRoutesLayer({ routes }) {
    // To prevent rendering an empty layer, return null if there are no routes
    if (!routes?.length) return null
    // The layer styling is based on the facility class (I, II, III, IV) for color and width.
    return new GeoJsonLayer({
        id: 'bike-routes-line-layer',
        data: routes,
        stroked: true,  
        filled: false,  // No fill, just stroke
        // Line width definition
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: LINE_WIDTH,
        lineWidthMaxPixels: LINE_WIDTH,
        // Line color based on facility class
        getLineColor: (f) => {return FACILITY_COLORS[f.properties?.facilitycl]},
        // Hover Highlight styling
        pickable: true, // Enable picking for hover events
        autoHighlight: true,    // Highlight on hover
        highlightColor: [255, 255, 255, 220],   // Bright white highlight with some opacity 
        // Update triggers to ensure the layer re-renders when the routes data changes
        updateTriggers: {
            getLineColor:  [routes],
            getLineWidth:  [routes],
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
    if (!object?.properties) return ''
    // Extract relevant properties with safe fallbacks
    const { street, ft_facilit, facilitycl, bikedir, fromstreet, tostreet } =
        object.properties
    // Map facility class to human-readable label, with a fallback for unknown classes
    const classLabel = FACILITY_LABELS[facilitycl] ?? 'Unknown'
    // Map bike direction codes to human-readable labels, with a fallback for unknown codes
    const dirLabel =
        bikedir === '1' ? 'One-way' : bikedir === '2' ? 'Bidirectional' : bikedir ?? '—'

    return [
        street         ? `Streets: ${street}`                       : null,
        fromstreet && tostreet
                       ? `   ${fromstreet} ---> ${tostreet}`      : null,
        `Type of facility:  ${classLabel}`,
        `Available direction:  ${dirLabel}`,
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