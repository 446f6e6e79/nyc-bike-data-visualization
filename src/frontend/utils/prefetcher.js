import useDayHourStats from '../hooks/useDayHourStats';
import useHourlyStats from '../hooks/useHourlyStats';
import useWeeklyStats from '../hooks/useWeeklyStats';
import useWeatherStats from '../hooks/useWeatherStats';
import useTripCounts from '../features/map/hooks/useTripCounts';
import useStationRideCounts from '../features/map/hooks/useStationRideCounts';

import { LIMIT_STATIONS, LIMIT_TRIPS } from '../config';

/**
 * Call all default hooks to prefetch data for the current page. 
 * They will cache the data according to their own caching policies, so this is just a way to trigger the fetches early.
 * @param {Object} filters - An object containing any filters to apply when fetching data
 */
export default function prefetchData(filters) {
    // Don't prefetch if there are no filters, as the hooks will likely not fetch anything useful without them
    if (!filters) return
    // Call all hooks to prefetch data for the current filters (this will be cached by the hooks)
    useDayHourStats(filters);
    useHourlyStats(filters);
    useWeeklyStats(filters);
    useWeatherStats(filters);
    useTripCounts({ limit:LIMIT_TRIPS, ...filters });
    useStationRideCounts({ limit:LIMIT_STATIONS, ...filters });
}