import { useMemo } from 'react'
import { useDatasetDateRange } from './useDatasetDateRange.js'
import { normalizeBounds } from '../utils/date_formatter.jsx'
import { MAX_COVERED_MONTHS } from '../../../utils/config.jsx'

/**
 * Provides normalized dataset bounds and slider defaults.
 * @returns the normalized bounds, minimum date, total months, maximum window size for selection, default range for the slider, and loading/error states related to fetching the dataset date range.
 */
export default function useDateBounds() {
    // Fetches the dataset date range and normalizes it to derive bounds, minimum date, total months, maximum window size for selection, and default range for the slider, along with loading and error states.
    const { dateRange, loading, error } = useDatasetDateRange()
    // Memoized bounds object that normalizes the API date range into usable minDate, maxDate, and totalMonths for the slider component.
    const bounds = useMemo(
        () => normalizeBounds(dateRange),
        [dateRange?.max_date, dateRange?.min_date],
    )
    // Extracts the minimum date from the normalized bounds.
    const minDate = bounds?.minDate ?? null
    // Calculates the total number of months in the dataset.
    const totalMonths = bounds?.totalMonths ?? 0
    // Determines the maximum window size for the date range selection.
    const maxWindowSize = Math.min(totalMonths, MAX_COVERED_MONTHS)
    // Sets the default range for the slider to the most recent month if there are available months, otherwise null.
    const defaultRange = useMemo(
        () => (totalMonths > 0 ? { startIndex: totalMonths - 1, endIndex: totalMonths - 1 } : null),
        [totalMonths],
    )

    return {
        bounds,
        minDate,
        totalMonths,
        maxWindowSize,
        defaultRange,
        loading,
        error,
    }
}