import { ArcLayer } from '@deck.gl/layers'

// Constants for arc styling based on trip usage
const BASE_ALPHA = 80
const MAX_ALPHA_RANGE = 175
const BASE_WIDTH = 3
const MAX_WIDTH_RANGE = 20
const SOURCE_COLOR = [14, 116, 144]
const TARGET_COLOR = [2, 132, 199]
const SELECTED_LINK_COLOR = [34, 197, 94]

/**
 * Normalizes trip usage to a 0–1 range
 * @param {Object} trip 
 * @param {number} maxTripCount 
 * @returns {number}
 */
function normalizeTripUsage(trip, maxTripCount) {
    return (Number(trip.total_daily_flow) || 0) / maxTripCount
}

/**
 * Computes arc width based on normalized usage
 * @param {number} normalizedUsage 
 * @returns {number} arc width in pixels
 */
function getArcWidth(normalizedUsage) {
    return BASE_WIDTH + normalizedUsage * MAX_WIDTH_RANGE
}

/**
 * Computes arc color with alpha based on normalized usage
 * @param {number[]} baseColor - RGB triplet
 * @param {number} normalizedUsage 
 * @returns {number[]} - RGBA array
 */
function getArcColor(baseColor, normalizedUsage) {
    const alpha = Math.round(BASE_ALPHA + normalizedUsage * MAX_ALPHA_RANGE)
    return [...baseColor, alpha]
}

/**
 * Creates a layer for displaying frequent trips based on their usage
 * @param {Array} trips - Array of trip objects with sourcePosition, targetPosition, and dailyFlow
 * @param {number} maxTripCount - Maximum trip count for scaling widths and colors
 * @returns {ArcLayer}
 */
export function createTripsArcLayer({ trips, maxTripCount, selectedStationIds = [] }) {
    const selectedStationIdSet = new Set(selectedStationIds)

    const isArcBetweenSelectedStations = (trip) =>
        selectedStationIdSet.has(trip.start_station_id) &&
        selectedStationIdSet.has(trip.end_station_id)

    return new ArcLayer({
        id: 'frequent-trips-layer',
        data: trips,
        getSourcePosition: (trip) => [trip.start_station_lon, trip.start_station_lat],
        getTargetPosition: (trip) => [trip.end_station_lon, trip.end_station_lat],
        getWidth: (trip) => getArcWidth(normalizeTripUsage(trip, maxTripCount)),
        getSourceColor: (trip) => {
            if (isArcBetweenSelectedStations(trip)) {
                return getArcColor(SELECTED_LINK_COLOR, normalizeTripUsage(trip, maxTripCount))
            }
            return getArcColor(SOURCE_COLOR, normalizeTripUsage(trip, maxTripCount))
        },
        getTargetColor: (trip) => {
            if (isArcBetweenSelectedStations(trip)) {
                return getArcColor(SELECTED_LINK_COLOR, normalizeTripUsage(trip, maxTripCount))
            }
            return getArcColor(TARGET_COLOR, normalizeTripUsage(trip, maxTripCount))
        },
        updateTriggers: {
            getWidth: [maxTripCount],
            getSourceColor: [maxTripCount, selectedStationIds],
            getTargetColor: [maxTripCount, selectedStationIds],
        },
        pickable: true,
        opacity: 0.75,
        widthMinPixels: 1,
        widthMaxPixels: 8,
        widthUnits: 'pixels',
        greatCircle: false,
        parameters: {
            depthTest: false,
        },
    })
}


/**
* Generates a tooltip for trip flow data, showing the number of rides between two stations.
* @param {Object} object - The trip flow data object.
* @returns {string} The tooltip content.
*/
export function tripArcsTooltip(object) {
    const rides = Math.round(Number(object.total_daily_flow) || 0)
    const from = object.start_station_name
    const to = object.end_station_name
    const totalRides = object.total_rides
    return `Trip: ${from} → ${to}\n Daily Rides: ${rides}\n Total Rides: ${totalRides}`
}

