const RIDES_FILTER = 2 // Minimum total rides to include a trip in the visualization
//#TODO: Move this constant to a more central location if it's used across multiple files
/**
 * Selector to process raw trip count data into a format suitable for visualization.
 * @param {*} tripCounts 
 * @returns 
 */
export function selectTrips(tripCounts) {
    // Handle case where tripCounts is undefined or null
    if (!tripCounts) return []
    return tripCounts
        .map((trip) => {
            const {
                station_a_id: start_station_id,
                station_a_name: start_station_name,
                station_a_lat: start_station_lat,
                station_a_lon: start_station_lon,
                station_b_id: end_station_id,
                station_b_name: end_station_name,
                station_b_lat: end_station_lat,
                station_b_lon: end_station_lon,
                groups: [{ total_rides, hours_count, a_to_b_count, b_to_a_count }],
            } = trip;
            const daysCount = Number(hours_count) / 24; // Convert hours count to days count for average daily flow calculation
            return {
                start_station_id,
                start_station_name,
                start_station_lat,
                start_station_lon,
                end_station_id,
                end_station_name,
                end_station_lat,
                end_station_lon,
                total_rides: Number(total_rides) || 0,
                total_daily_flow: daysCount > 0 ? total_rides / daysCount : 0, // Convert to average daily rides
                a_to_b_flow: daysCount > 0 ? a_to_b_count / daysCount : 0,
                b_to_a_flow: daysCount > 0 ? b_to_a_count / daysCount : 0,
            };
        })
        .filter(
            (trip) =>
                Number.isFinite(trip.start_station_lat) &&
                Number.isFinite(trip.start_station_lon) &&
                Number.isFinite(trip.end_station_lat) &&
                Number.isFinite(trip.end_station_lon) &&
                Number.isFinite(trip.total_daily_flow) &&
                trip.total_daily_flow > RIDES_FILTER        // Filter out trips that don't meet the minimum rides threshold
        );
}

/**
 * Returns the maximum daily flow count across all trips.
 * @param {*} trips - Array of processed trip objects from selectTrips
 * @returns {number} The maximum total_daily_flow value
 */
export function selectMaxFlow(trips) {
    return Math.max(...trips.map((trip) => trip.total_daily_flow));
}