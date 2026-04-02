import { stationUsageTooltip } from '../utils/layers/stationUsageLayer.jsx'
import { tripFlowTooltip } from '../utils/layers/tripFlowLayer.jsx'
import { bikeRouteTooltip } from '../utils/layers/bikeRoutesLayer.jsx'
import { stationAvailabilityTooltip } from '../utils/layers/stationAvailabilityLayer.jsx'

/**
 * Renders a tooltip based on the active layer and the provided object.
 * @param {Object} object - The data object associated with the hovered element on the map.
 * @param {string} activeLayer - The currently active map layer to determine tooltip content. 
 * @returns 
 */
export default function Tooltip({ object, activeLayer }) {
    // To avoid errors when hovering over empty areas of the map
    if (!object) return null
    switch (activeLayer) {
        case 'station_usage':
            return stationUsageTooltip(object)
        case 'trip_flow':
            return tripFlowTooltip(object)
        case 'infrastructure':
            // Distinguish between station availability points and bike route segments
            if (object.geometry !== undefined) {
                return bikeRouteTooltip(object)
            }
            return stationAvailabilityTooltip(object)
        default:
            return null
    }
}