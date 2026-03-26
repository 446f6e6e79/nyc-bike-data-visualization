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
                groups: [{ total_rides, days_count, a_to_b_count, b_to_a_count }],
            } = trip;

            return {
                start_station_id,
                start_station_name,
                start_station_lat,
                start_station_lon,
                end_station_id,
                end_station_name,
                end_station_lat,
                end_station_lon,
                total_daily_flow: total_rides / days_count,
                a_to_b_flow: a_to_b_count / days_count, // Assuming all flow is from A to B for simplicity
                b_to_a_flow: b_to_a_count / days_count, // Assuming all flow is from B to A for simplicity
            };
        })
        .filter(
            (trip) =>
                Number.isFinite(trip.start_station_lat) &&
                Number.isFinite(trip.start_station_lon) &&
                Number.isFinite(trip.end_station_lat) &&
                Number.isFinite(trip.end_station_lon) &&
                Number.isFinite(trip.total_daily_flow)
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