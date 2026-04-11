import { LAYER_OPTIONS } from "../MapPage.jsx"
import { stationAvailabilityLegend } from "../layers/infrastructure_layer/stations/stationAvailabilityLayer.jsx"
import { bikeRoutesLegend } from "../layers/infrastructure_layer/bike_routes/bikeRoutesLayer.jsx"
import { stationUsageLegend } from "../layers/station_usage_layer/stationUsageLayer.jsx"
import { tripFlowLegend } from "../layers/trip_flow_layer/tripFlowLayer.jsx"

/**
 * Renders a single legend row: swatch + label + optional hint.
 */
function LegendRow({ swatch, label, hint }) {
    return (
        <li className="map-legend__row">
            <span className="map-legend__swatch" style={{ background: swatch }} />
            <span className="map-legend__label">{label}</span>
            {hint && <span className="map-legend__hint">{hint}</span>}
        </li>
    )
}

/**
 * Resolves the legend descriptor (entries + optional sub-sections) for the
 * currently active layer. Each layer returns a plain `{ entries, ... }` object
 * so MapLegend can render them uniformly.
 */
function legendFor(activeLayer, { showBikeRoutes }) {
    switch (activeLayer) {
        case 'station_usage':  return stationUsageLegend()
        case 'trip_flow':      return tripFlowLegend()
        case 'infrastructure': return stationAvailabilityLegend({ showBikeRoutes })
        default:               return { entries: [] }
    }
}

/**
 * Map legend panel — renders the active layer's swatch rows on an ink card.
 * @param {string} activeLayer
 * @param {boolean} showBikeRoutes - when true, an extra bike-routes section is surfaced
 */
export default function MapLegend({ activeLayer, showBikeRoutes }) {
    const activeLayerLabel = LAYER_OPTIONS.find((layer) => layer.value === activeLayer)?.label || 'Layer'
    const legend = legendFor(activeLayer, { showBikeRoutes })

    return (
        <div className="map-legend">
            <p className="map-legend-title">{activeLayerLabel}</p>
            <ul className="map-legend__list">
                {legend.entries.map((entry) => (
                    <LegendRow key={entry.label} {...entry} />
                ))}
            </ul>
            {legend.includeBikeRoutes && (
                <div className="map-legend__section">
                    <small className="map-legend__section-label">Bike routes</small>
                    <ul className="map-legend__list">
                        {bikeRoutesLegend().entries.map((entry) => (
                            <LegendRow key={entry.label} {...entry} />
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
