import { useMemo } from 'react'
import useStationRideCounts from '../../hooks/useStationRideCounts.js'
import { selectStations, getStationForCurrentTime, getMaxUsage, getMaxDelta} from '../selectors/stationUsage.js'
import { LIMIT_STATIONS } from '../../config.jsx'

/**
 * Custom hook to fetch and process station usage data for the station usage layer. 
 * It retrieves station ride counts, filters them based on the current time frame, and calculates the maximum usage for scaling purposes.
 * @param {Object} dateRange - Optional date range for filtering station usage data.
 * @param {number} currentTime - Current hour frame (0-23) for filtering station usage data.
 * @returns {Object} An object containing the filtered station data for the current time frame, maximum usage value, loading state, and error state.
 */
export function useStationUsageLayer({ dateRange, currentTime }) {
    // Build filters for station usage data
    const stationRideCountFilters = {
        limit: LIMIT_STATIONS,
        group_by: 'hour',
        ...(dateRange ?? {})
    }

    // Fetch station ride counts with the specified filters using the custom hook
    const { stationRideCounts,
        loading: loading,
        error: error
    } = useStationRideCounts(stationRideCountFilters)

    // Process station data to get the stations for the current time frame and calculate the maximum usage for scaling
    const stations = useMemo(() => selectStations(stationRideCounts), [stationRideCounts])
    const frameStations = useMemo(() => getStationForCurrentTime(stations, currentTime), [stations, currentTime])
    const maxUsage = useMemo(() => getMaxUsage(stations), [stations])
    const maxDelta = useMemo(() => getMaxDelta(stations), [stations])

    return { frameStations, maxUsage, maxDelta, loading, error }
}