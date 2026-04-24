import { LAYER_OPTIONS } from "../MapPage.jsx";
import LegendRow from "./LegendRow.jsx";
import { legendFor, bikeRoutesLegend } from "../utils/map_legend.js";

/**
 * Map legend panel — renders the active layer's swatch rows on an ink card.
 * @param {string} activeLayer - Key of the layer whose legend should be displayed.
 * @param {boolean} showBikeRoutes - When true, an extra bike-routes section is surfaced.
 * @returns {JSX.Element} Legend panel for the current map layer.
 */
export default function MapLegend({ activeLayer, showBikeRoutes }) {
    const activeLayerLabel = LAYER_OPTIONS.find((layer) => layer.value === activeLayer)?.label || "Layer";
    const legend = legendFor(activeLayer, { showBikeRoutes });

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
    );
}
