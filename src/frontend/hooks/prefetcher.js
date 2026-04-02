import useDayHourStats from './useDayHourStats';
import useHourlyStats from './useHourlyStats';
import useWeeklyStats from './useWeeklyStats';
import useWeatherStats from './useWeatherStats';
import useTripCounts from './useTripCounts';
import useStationRideCounts from './useStationRideCounts';

import { LIMIT_STATIONS, LIMIT_TRIPS } from '../config';

/**
 * Call all default hooks to prefetch data for the current page. 
 * They will cache the data according to their own caching policies, so this is just a way to trigger the fetches early.
 * @param {Object} filters - An object containing any filters to apply when fetching data
 */
export default function prefetchData(filters) {
    useDayHourStats(filters);
    useHourlyStats(filters);
    useWeeklyStats(filters);
    useWeatherStats(filters);
    useTripCounts({ limit:LIMIT_TRIPS, ...filters });
    useStationRideCounts({ limit:LIMIT_STATIONS, ...filters });
}