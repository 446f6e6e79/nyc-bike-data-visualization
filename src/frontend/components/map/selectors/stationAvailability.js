/**
 * Selector functions for processing raw station availability data into
 * a format suitable for map visualization
 */
export function selectStationAvailability(stationData) {
    // Ensure stationData is an array before processing
    const stationRows = Array.isArray(stationData) ? stationData : []
    
    const processedStations = stationRows.map((station) => {
        // Compute the actual capacity of the station by subtracting disabled bikes from total capacity
        const actual_capacity = station.capacity - station.num_bikes_disabled
        
        // Calculate availability score based on available bikes and actual capacity
        // Higher score indicates that the station has a lot of available bikes
        const availability_score = actual_capacity > 0
            ? (station.num_classic_bikes_available + station.num_ebikes_available) / actual_capacity
            : 0
        
        // Calculate dock score based on available docks and actual capacity
        // Higher score indicates that the station has a lot of available docks
        const dock_score = actual_capacity > 0
            ? station.num_docks_available / actual_capacity
            : 0

        // Define the station health score as a combination of bike availability and dock availability
        const station_health = actual_capacity > 0
            ? (station.num_classic_bikes_available + station.num_ebikes_available + station.num_docks_available) / actual_capacity
            : 0
        
        return {
            id: station.id,
            name: station.name,
            latitude: station.lat,
            longitude: station.lon,
            classicalBikes: station.num_classic_bikes_available,
            electricBikes: station.num_ebikes_available,
            available_docks: station.num_docks_available,
            capacity: station.capacity,
            availability_score: availability_score,
            dock_score: dock_score,
            station_health: station_health
        }
    })
    return processedStations
}