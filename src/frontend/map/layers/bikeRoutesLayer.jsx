import { GeoJsonLayer } from '@deck.gl/layers'
//#TODO: Refactor graphics and colors of this component

/**
 * Color map for bike facility classes.
 * Class I   = Protected / Separated path  → green
 * Class II  = Marked Bike Lane            → blue
 * Class III = Shared Lane (sharrow)       → orange
 * Class IV  = Greenway / Off-street       → teal
 * Unknown                                 → grey
 */
const FACILITY_COLORS = {
    'I':   [16, 185, 129, 255],  // vivid green
    'II':  [37, 99, 235, 255],   // strong blue
    'III': [234, 88, 12, 255],   // strong orange
    'IV':  [13, 148, 136, 255],  // deep teal
}

const DEFAULT_COLOR = [120, 120, 120, 160]

// Utility function to get color based on facility class, with a default fallback for unknown classes.
function getFacilityColor(facilitycl) {
    return FACILITY_COLORS[facilitycl] ?? DEFAULT_COLOR
}

/**
 * Creates a GeoJsonLayer for rendering NYC bike routes as colored line segments.
 * @param {Array} routes - Array of BikeRoute objects from the backend.
 * @returns {GeoJsonLayer}
 */
export function createBikeRoutesLayer({ routes }) {
    if (!routes || routes.length === 0) return null

    const featureCollection = {
        type: 'FeatureCollection',
        features: routes.map((route) => ({
            type: 'Feature',
            geometry: route.geometry,
            properties: route,
        })),
    }

    return [
        new GeoJsonLayer({
            id: 'bike-routes-layer',
            data: featureCollection,
            stroked: true,
            filled: false,

            // thicker + responsive feel
            lineWidthMinPixels: 2,
            lineWidthMaxPixels: 12,
            getLineWidth: (f) => {
                const cl = f.properties?.facilitycl
                if (cl === 'I') return 6   // protected → thicker
                if (cl === 'II') return 5
                if (cl === 'III') return 4
                if (cl === 'IV') return 5
                return 3
            },

            getLineColor: (f) => getFacilityColor(f.properties?.facilitycl),

            pickable: true,
            autoHighlight: true,

            // stronger highlight
            highlightColor: [255, 255, 255, 255],

            // smoother look
            lineCapRounded: true,
            lineJointRounded: true,

            updateTriggers: {
                getLineColor: routes,
            },
        }),
    ]
}

/**
 * Tooltip content for a hovered bike route segment.
 * @param {Object} object - The hovered GeoJSON feature.
 * @returns {string}
 */
export function bikeRouteTooltip(object) {
    const { street, ft_facilitit, facilitycl, bikedir, borough } = object.properties
    const classLabel = {
        'I': 'Protected Path',
        'II': 'Bike Lane',
        'III': 'Shared Lane',
        'IV': 'Greenway',
    }[facilitycl] ?? 'Unknown'

    return [
        street ? `Street: ${street}` : null,
        `Type: ${classLabel}`,
        ft_facilitit ? `Facility: ${ft_facilitit}` : null,
        bikedir ? `Direction: ${bikedir}` : null,
        borough ? `Borough: ${borough}` : null,
    ]
        .filter(Boolean)
        .join('\n')
}

/**
 * Legend entries for the bike routes layer.
 */
export function bikeRoutesLegend() {
    const entries = [
        { color: 'rgb(34,197,94)',   label: 'Protected Path (Class I)' },
        { color: 'rgb(59,130,246)',  label: 'Bike Lane (Class II)' },
        { color: 'rgb(249,115,22)', label: 'Shared Lane (Class III)' },
        { color: 'rgb(20,184,166)', label: 'Greenway (Class IV)' },
    ]
    return (
        <div className="map-legend">
            {entries.map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                        display: 'inline-block',
                        width: 24,
                        height: 4,
                        borderRadius: 2,
                        background: color,
                        flexShrink: 0,
                    }} />
                    <small>{label}</small>
                </div>
            ))}
        </div>
    )
}