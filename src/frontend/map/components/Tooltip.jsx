import { stationUsageTooltip } from '../layers/stationUsageLayer.js'
import { tripFlowTooltip } from '../layers/tripFlowLayer.js'

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
        default:
            return null
    }
}


