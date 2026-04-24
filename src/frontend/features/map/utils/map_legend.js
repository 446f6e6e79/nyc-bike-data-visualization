import { stationAvailabilityLegend } from "../layers/infrastructure_layer/stations/stationAvailabilityLayer.jsx";
import { bikeRoutesLegend } from "../layers/infrastructure_layer/bike_routes/bikeRoutesLayer.jsx";
import { stationUsageLegend } from "../layers/station_usage_layer/stationUsageLayer.jsx";
import { tripFlowLegend } from "../layers/trip_flow_layer/tripFlowLayer.jsx";

/**
 * Resolves the legend descriptor (entries + optional sub-sections) for the
 * currently active layer. Each layer returns a plain `{ entries, ... }` object
 * so MapLegend can render them uniformly.
 * @param {string} activeLayer - Key of the active map layer (e.g. "station_usage").
 * @param {{ showBikeRoutes: boolean }} options - Extra flags forwarded to layer-specific legend builders.
 * @returns {{ entries: Array, includeBikeRoutes?: boolean }} Legend descriptor consumed by MapLegend.
 */
export function legendFor(activeLayer, { showBikeRoutes }) {
    switch (activeLayer) {
        case "station_usage":
            return stationUsageLegend();
        case "trip_flow":
            return tripFlowLegend();
        case "infrastructure":
            return stationAvailabilityLegend({ showBikeRoutes });
        default:
            return { entries: [] };
    }
}

export { bikeRoutesLegend };
