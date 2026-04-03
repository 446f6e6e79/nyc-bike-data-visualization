import { createTripStationsLayer } from "./stations/tripStationsLayer";
import { createTripsArcLayer } from "./trips/tripArcsLayer";

/**
 * Creates the layers for visualizing trip flows between stations, including arcs for trips and points for stations.
 * @param {Array} trips - Array of trip objects with source and target positions and daily flow
 * @param {number} maxTripCount - Maximum trip count for scaling arc widths and colors
 * @param {Array} stations - Array of station objects with latitude and longitude for displaying station points 
 * @returns 
 */
export function createTripFlowLayers({ trips, maxTripCount, stations }) {
    const layers = []
    layers.push(createTripsArcLayer({ trips, maxTripCount }))
    layers.push(createTripStationsLayer({ stations }))
    return layers
}

/**
* Creates a legend for the trip flow layer, indicating that the arcs represent frequent trips.
* @returns {JSX.Element} The legend component for the trip flow layer.
*/
export function tripFlowLegend() {
    return (
        <div className="map-legend">
            <p className="map-legend-text">Frequent trips</p>
        </div>
    )
}